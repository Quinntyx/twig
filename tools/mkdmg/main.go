// mkdmg builds a styled macOS disk image from a packaged .app without hdiutil.
// It is used by CI, where the runner is Linux and electron-builder's dmg
// target is unavailable.
package main

import (
	"flag"
	"fmt"
	"os"

	"github.com/leaanthony/dmg/dmg"
)

func main() {
	app := flag.String("app", "", "path to the .app bundle")
	out := flag.String("out", "", "path to the output .dmg")
	volume := flag.String("volume", "Twig", "volume name shown in Finder")
	appName := flag.String("name", "Twig", "name of the app inside the image")
	flag.Parse()

	if *app == "" || *out == "" {
		fmt.Fprintln(os.Stderr, "usage: mkdmg -app <Twig.app> -out <Twig.dmg> [-volume Twig] [-name Twig]")
		os.Exit(2)
	}

	err := dmg.Build(dmg.Options{
		VolumeName:             *volume,
		OutputPath:             *out,
		Files:                  map[string]string{*appName + ".app": *app},
		AddApplicationsSymlink: true,
		Window: dmg.WindowConfig{
			X: 200, Y: 160, Width: 560, Height: 400,
		},
		Icon: dmg.IconConfig{Size: 128, TextSize: 13, GridSpace: 100},
		IconPositions: map[string]dmg.IconPosition{
			*appName + ".app": {X: 150, Y: 190},
			"Applications":    {X: 410, Y: 190},
		},
		Backend: dmg.BackendNative,
	})
	if err != nil {
		fmt.Fprintf(os.Stderr, "mkdmg: %v\n", err)
		os.Exit(1)
	}
}
