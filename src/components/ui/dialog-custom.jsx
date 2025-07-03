"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "../../lib/utils"

// Customized DialogContent that doesn't include the automatic close button
function CustomDialogContent({
  className,
  children,
  ...props
}) {  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
      />
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <DialogPrimitive.Content
          className={cn(
            "w-full max-w-lg gap-4 bg-white shadow-lg rounded-lg overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            className
          )}        {...props}
          >
            {children}
          </DialogPrimitive.Content>
      </div>
    </DialogPrimitive.Portal>
  )
}

// Custom close button that can be placed anywhere inside the dialog
function CustomDialogClose({ className, children, ...props }) {
  return (
    <DialogPrimitive.Close
      className={cn(
        "absolute top-4 right-4 z-50 rounded-full p-2 text-gray-500 bg-white shadow-md hover:bg-gray-100 transition-all hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2",
        className
      )}
      {...props}
    >
      {children || (
        <>
          <X className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </>
      )}
    </DialogPrimitive.Close>
  )
}

export { CustomDialogContent, CustomDialogClose }
