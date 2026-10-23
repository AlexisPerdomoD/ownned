package main

import (
	"github.com/spf13/cobra"
)

var adminCmd = &cobra.Command{
	Use:   "admin",
	Short: "Administrative tools (extension point)",
}

func init() {
	rootCmd.AddCommand(adminCmd)
}