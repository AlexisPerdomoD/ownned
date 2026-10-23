package main

import (
	"fmt"

	"github.com/spf13/cobra"
)

var seedCmd = &cobra.Command{
	Use:   "seed",
	Short: "Manage seed data (extension point)",
}

var seedListCmd = &cobra.Command{
	Use:   "list",
	Short: "List registered seeds",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println("no seeds registered")
	},
}

var seedRunCmd = &cobra.Command{
	Use:   "run",
	Short: "Run one or all seeds",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println("no seeds registered")
	},
}

func init() {
	seedCmd.AddCommand(seedListCmd)
	seedCmd.AddCommand(seedRunCmd)
	rootCmd.AddCommand(seedCmd)
}