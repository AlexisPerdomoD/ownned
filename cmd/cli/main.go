package main

import (
	"fmt"
	"os"
	"time"

	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "owned-cli",
	Short: "Operational CLI for ownned",
	Long:  "owned-cli provides operational commands for the ownned server: users, migrations, seeds and admin tools.",
}

func main() {
	start := time.Now()

	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	end := time.Since(start)
	fmt.Printf("Took %s seconds.\n", end.Round(time.Second).String())
}
