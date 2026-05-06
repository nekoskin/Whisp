package singbox


// #cgo LDFLAGS: -llog
// #include <android/log.h>
// #include <stdlib.h>
// static void go_logcat(const char* msg) {
//     __android_log_print(ANDROID_LOG_INFO, "singbox-go", "%s", msg);
// }
import "C"

import (
	"fmt"
	"os"
	"runtime/debug"
	"sync"
	"unsafe"

	"github.com/sagernet/sing-box/experimental/libbox"
)

func alog(msg string) {
	cs := C.CString(msg)
	C.go_logcat(cs)
	C.free(unsafe.Pointer(cs))
}

var (
	mu      sync.Mutex
	service *libbox.BoxService
)

type emptyIterator struct{}

func (e *emptyIterator) Next() *libbox.NetworkInterface { return nil }
func (e *emptyIterator) HasNext() bool                  { return false }

type platform struct{ tunFd int32 }

func (p *platform) OpenTun(options libbox.TunOptions) (int32, error) {
	alog(fmt.Sprintf("OpenTun called, returning fd=%d", p.tunFd))
	return p.tunFd, nil
}
func (p *platform) AutoDetectInterfaceControl(fd int32) error              { return nil }
func (p *platform) UsePlatformAutoDetectInterfaceControl() bool            { return false }
func (p *platform) UsePlatformDefaultInterfaceMonitor() bool               { return false }
func (p *platform) StartDefaultInterfaceMonitor(l libbox.InterfaceUpdateListener) error {
	return nil
}
func (p *platform) CloseDefaultInterfaceMonitor(l libbox.InterfaceUpdateListener) error {
	return nil
}
func (p *platform) FindConnectionOwner(ipProto int32, srcAddr string, srcPort int32, dstAddr string, dstPort int32) (int32, error) {
	return 0, nil
}
func (p *platform) PackageNameByUid(uid int32) (string, error)  { return "", nil }
func (p *platform) UIDByPackageName(pkg string) (int32, error)  { return 0, nil }
func (p *platform) UsePlatformInterfaceGetter() bool            { return false }
func (p *platform) GetInterfaces() (libbox.NetworkInterfaceIterator, error) {
	return &emptyIterator{}, nil
}
func (p *platform) UnderNetworkExtension() bool                              { return false }
func (p *platform) IncludeAllNetworks() bool                                 { return false }
func (p *platform) WriteLog(message string)                                  { alog("sb: " + message) }
func (p *platform) UseProcFS() bool                                          { return false }
func (p *platform) ReadWIFIState() *libbox.WIFIState                         { return &libbox.WIFIState{} }
func (p *platform) ClearDNSCache()                                           {}
func (p *platform) SendNotification(notification *libbox.Notification) error { return nil }

// Start запускает sing-box. fd — ParcelFileDescriptor.getFd() из Kotlin.
func Start(fd int32, workDir string, socksAddr string, connKey string) (retErr error) {
	alog(fmt.Sprintf("Start() ENTER fd=%d workDir=%s socksAddr=%s", fd, workDir, socksAddr))

	defer func() {
		if r := recover(); r != nil {
			stack := string(debug.Stack())
			msg := fmt.Sprintf("PANIC in Start: %v\n%s", r, stack)
			alog(msg)
			retErr = fmt.Errorf("panic: %v", r)
		}
	}()

	mu.Lock()
	defer mu.Unlock()

	if service != nil {
		alog("already running")
		return fmt.Errorf("already running")
	}

	if workDir != "" {
		if err := os.MkdirAll(workDir, 0o755); err != nil {
			alog(fmt.Sprintf("MkdirAll failed: %v", err))
		}
		// Set CWD so sing-box's relative "cache.db" resolves to writable app dir.
		// Safe here: called under mu.Lock before any sing-box goroutines start.
		if err := os.Chdir(workDir); err != nil {
			alog(fmt.Sprintf("Chdir failed: %v", err))
		}
	}

	alog("building config")

	var outbounds, finalOut string
	if socksAddr != "" {
		finalOut = "proxy"
		outbounds = fmt.Sprintf(`[{"type":"direct","tag":"direct"},{"type":"socks","tag":"proxy","server":"127.0.0.1","server_port":1080,"version":"5","username":"whisp","password":%q}]`, connKey)
	} else {
		finalOut = "direct"
		outbounds = `[{"type":"direct","tag":"direct"}]`
	}

	config := fmt.Sprintf(`{
  "log": {"level": "debug", "output": ""},
  "inbounds": [{
    "type": "tun",
    "tag": "tun-in",
    "address": ["172.19.0.1/30"],
    "mtu": 1500,
    "auto_route": false,
    "stack": "gvisor",
    "sniff": false
  }],
  "outbounds": %s,
  "route": {
    "final": "%s",
    "auto_detect_interface": false
  }
}`, outbounds, finalOut)

	alog(fmt.Sprintf("calling NewService fd=%d", fd))
	s, err := libbox.NewService(config, &platform{tunFd: fd})
	if err != nil {
		alog(fmt.Sprintf("NewService error: %v", err))
		return fmt.Errorf("NewService: %w", err)
	}
	alog("NewService OK, calling Start")

	if err := s.Start(); err != nil {
		alog(fmt.Sprintf("Start error: %v", err))
		_ = s.Close()
		return fmt.Errorf("Start: %w", err)
	}
	alog("Start OK — VPN running")
	service = s
	return nil
}

// Stop останавливает sing-box.
func Stop() {
	alog("Stop() called")
	mu.Lock()
	defer mu.Unlock()
	if service != nil {
		_ = service.Close()
		service = nil
		alog("Stop() done")
	}
}
