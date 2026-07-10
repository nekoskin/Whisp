//go:build tools

package singbox

// Keeps whispera + golang.org/x/mobile in go.mod through `go mod tidy` so
// `gomobile bind` can bind the in-process go-client package. Excluded from the
// real singbox build by the `tools` tag (never compiled into the AAR).
import (
	_ "golang.org/x/mobile/bind"

	_ "whispera/mobile/goclient"
)
