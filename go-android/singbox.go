package singbox

// #cgo LDFLAGS: -llog
// #include <android/log.h>
// #include <stdlib.h>
// static void go_logcat(const char* msg) {
//     __android_log_print(ANDROID_LOG_INFO, "singbox-go", "%s", msg);
// }
import "C"

import (
	"bufio"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net"
	"os"
	"runtime/debug"
	"strconv"
	"strings"
	"sync"
	"unsafe"

	"github.com/sagernet/sing-box/experimental/libbox"
)

func init() {
	r, w, err := os.Pipe()
	if err != nil {
		return
	}
	os.Stdout = w
	os.Stderr = w
	go func() {
		scanner := bufio.NewScanner(r)
		scanner.Buffer(make([]byte, 64*1024), 64*1024)
		for scanner.Scan() {
			if line := scanner.Text(); line != "" {
				alog(line)
			}
		}
	}()
}

type inputRule struct {
	Kind    string `json:"kind"`
	Suffix  string `json:"suffix,omitempty"`
	Keyword string `json:"keyword,omitempty"`
	Domain  string `json:"domain,omitempty"`
	CIDR    string `json:"cidr,omitempty"`
	Name    string `json:"name,omitempty"`
	Action  string `json:"action"`
}

type sbRouteRule struct {
	DomainSuffix  []string `json:"domain_suffix,omitempty"`
	DomainKeyword []string `json:"domain_keyword,omitempty"`
	Domain        []string `json:"domain,omitempty"`
	IPCIDR        []string `json:"ip_cidr,omitempty"`
	Outbound      string   `json:"outbound"`
}

func buildSingboxRoutes(rulesJson string) (routesJSON string, needSniff bool, needBlock bool) {
	if rulesJson == "" {
		return "", false, false
	}
	var rules []inputRule
	if err := json.Unmarshal([]byte(rulesJson), &rules); err != nil || len(rules) == 0 {
		return "", false, false
	}

	byOutbound := map[string]*sbRouteRule{}
	actionToOutbound := func(action string) string {
		switch action {
		case "DIRECT":
			return "direct"
		case "REJECT", "BLOCK":
			return "block"
		default:
			return "proxy"
		}
	}

	for _, r := range rules {
		out := actionToOutbound(r.Action)
		if _, exists := byOutbound[out]; !exists {
			byOutbound[out] = &sbRouteRule{Outbound: out}
		}
		entry := byOutbound[out]
		switch r.Kind {
		case "domain-suffix":
			if r.Suffix != "" {
				entry.DomainSuffix = append(entry.DomainSuffix, r.Suffix)
				needSniff = true
			}
		case "domain-keyword":
			if r.Keyword != "" {
				entry.DomainKeyword = append(entry.DomainKeyword, r.Keyword)
				needSniff = true
			}
		case "domain-exact":
			if r.Domain != "" {
				entry.Domain = append(entry.Domain, r.Domain)
				needSniff = true
			}
		case "ip-cidr":
			if r.CIDR != "" {
				entry.IPCIDR = append(entry.IPCIDR, r.CIDR)
			}
		}
	}

	if _, ok := byOutbound["block"]; ok {
		needBlock = true
	}

	var sbRules []sbRouteRule
	for _, out := range []string{"block", "direct", "proxy"} {
		if r, ok := byOutbound[out]; ok {
			sbRules = append(sbRules, *r)
		}
	}
	if len(sbRules) == 0 {
		return "", false, false
	}

	b, err := json.Marshal(sbRules)
	if err != nil {
		return "", false, false
	}
	return string(b), needSniff, needBlock
}

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
func (p *platform) AutoDetectInterfaceControl(fd int32) error   { return nil }
func (p *platform) UsePlatformAutoDetectInterfaceControl() bool { return false }
func (p *platform) StartDefaultInterfaceMonitor(l libbox.InterfaceUpdateListener) error {
	return nil
}
func (p *platform) CloseDefaultInterfaceMonitor(l libbox.InterfaceUpdateListener) error {
	return nil
}
func (p *platform) FindConnectionOwner(ipProto int32, srcAddr string, srcPort int32, dstAddr string, dstPort int32) (*libbox.ConnectionOwner, error) {
	return &libbox.ConnectionOwner{}, nil
}
func (p *platform) GetInterfaces() (libbox.NetworkInterfaceIterator, error) {
	return &emptyIterator{}, nil
}
func (p *platform) UnderNetworkExtension() bool                              { return false }
func (p *platform) IncludeAllNetworks() bool                                 { return false }
func (p *platform) UseProcFS() bool                                          { return false }
func (p *platform) ReadWIFIState() *libbox.WIFIState                         { return &libbox.WIFIState{} }
func (p *platform) SystemCertificates() libbox.StringIterator                { return nil }
func (p *platform) LocalDNSTransport() libbox.LocalDNSTransport              { return nil }
func (p *platform) ClearDNSCache()                                           {}
func (p *platform) SendNotification(notification *libbox.Notification) error { return nil }

func Start(fd int32, workDir string, socksAddr string, connKey string, rulesJson string, ipv6 bool, dnsMode string, dnsServer string, mixedPort int32, mixedUser string, mixedPass string, allowLan bool) (retErr error) {
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
		if err := os.Chdir(workDir); err != nil {
			alog(fmt.Sprintf("Chdir failed: %v", err))
		}
	}

	if err := libbox.Setup(&libbox.SetupOptions{
		BasePath:    workDir,
		WorkingPath: workDir,
		TempPath:    workDir,
	}); err != nil {
		alog(fmt.Sprintf("libbox.Setup failed: %v", err))
	}

	alog("building config")

	routesJSON, _, needBlock := buildSingboxRoutes(rulesJson)

	var outbounds, finalOut string
	if socksAddr != "" {
		finalOut = "proxy"
		host, portStr, _ := net.SplitHostPort(socksAddr)
		port := 1080
		if p, err := strconv.Atoi(portStr); err == nil {
			port = p
		}
		h := sha256.Sum256([]byte(connKey))
		pass := hex.EncodeToString(h[:])
		outbounds = fmt.Sprintf(`[{"type":"direct","tag":"direct","domain_strategy":"prefer_ipv4"},{"type":"socks","tag":"proxy","server":%q,"server_port":%d,"version":"5","username":"whisp","password":%q}`, host, port, pass)
		if needBlock {
			outbounds += `,{"type":"block","tag":"block"}`
		}
		outbounds += `]`
	} else {
		finalOut = "direct"
		if needBlock {
			outbounds = `[{"type":"direct","tag":"direct","domain_strategy":"prefer_ipv4"},{"type":"block","tag":"block"}]`
		} else {
			outbounds = `[{"type":"direct","tag":"direct","domain_strategy":"prefer_ipv4"}]`
		}
	}

	routeRules := `[{"action":"sniff"}]`
	if routesJSON != "" {
		inner := strings.TrimSpace(routesJSON)
		inner = strings.TrimPrefix(inner, "[")
		inner = strings.TrimSuffix(inner, "]")
		if strings.TrimSpace(inner) != "" {
			routeRules = `[{"action":"sniff"},` + inner + `]`
		}
	}

	mixedInbound := ""
	if mixedPort > 0 {
		listenAddr := "127.0.0.1"
		if allowLan {
			listenAddr = "0.0.0.0"
		}
		usersJSON := ""
		if mixedUser != "" && mixedPass != "" {
			usersJSON = fmt.Sprintf(`,"users":[{"username":%q,"password":%q}]`, mixedUser, mixedPass)
		}
		mixedInbound = fmt.Sprintf(`,{"type":"mixed","tag":"mixed-in","listen":%q,"listen_port":%d%s}`, listenAddr, mixedPort, usersJSON)
	}

	tunAddrs := `"172.19.0.1/30"`
	fakeRange := `"inet4_range":"198.18.0.0/15"`
	if ipv6 {
		tunAddrs += `, "fdfe:dcba:9876::1/126"`
		fakeRange += `,"inet6_range":"fc00::/18"`
	}

	if dnsServer == "" {
		dnsServer = "1.1.1.1"
	}
	useLocal := dnsServer == "system" || socksAddr == ""

	dnsAddr := dnsServer
	dnsTag := "dns_udp"
	switch dnsMode {
	case "tcp":
		dnsAddr, dnsTag = "tcp://"+dnsServer, "dns_tcp"
	case "doh":
		dnsAddr, dnsTag = "https://"+dnsServer+"/dns-query", "dns_doh"
	}

	var dnsServers, dnsFinal string
	if !useLocal {
		dnsServers = fmt.Sprintf(`{"type":"fakeip","tag":"fakeip",%s},{"address":%q,"tag":%q,"detour":"proxy"}`, fakeRange, dnsAddr, dnsTag)
		dnsFinal = dnsTag
	} else {
		dnsServers = fmt.Sprintf(`{"type":"fakeip","tag":"fakeip",%s},{"address":"local","tag":"dns_local"}`, fakeRange)
		dnsFinal = "dns_local"
	}
	dnsObject := fmt.Sprintf(`{
    "servers": [%s],
    "rules": [{"query_type":["A","AAAA"],"server":"fakeip"}],
    "final": %q,
    "independent_cache": true
  }`, dnsServers, dnsFinal)

	config := fmt.Sprintf(`{
  "log": {"level": "info"},
  "dns": %s,
  "inbounds": [{
    "type": "tun",
    "tag": "tun-in",
    "address": [%s],
    "mtu": 1500,
    "auto_route": false,
    "stack": "mixed"
  }%s],
  "outbounds": %s,
  "route": {
    "rules": %s,
    "final": "%s",
    "auto_detect_interface": false
  }
}`, dnsObject, tunAddrs, mixedInbound, outbounds, routeRules, finalOut)

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
