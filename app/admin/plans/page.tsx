"use client"

import { useState, useEffect } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Loader2, AlertCircle, Plus, Pencil } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { ColumnDef } from "@tanstack/react-table"

// Form validation schema
const planSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  dailyInterest: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Daily interest must be a positive number",
  }),
  minAmount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Minimum amount must be a positive number",
  }),
  maxAmount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Maximum amount must be a positive number",
  }),
  durationDays: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Duration must be a positive number",
  }),
  isActive: z.boolean().default(true),
})

interface Plan {
  id: number
  name: string
  description: string
  dailyInterest: string
  minAmount: string
  maxAmount: string
  durationDays: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)

  const form = useForm<z.infer<typeof planSchema>>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: "",
      description: "",
      dailyInterest: "",
      minAmount: "",
      maxAmount: "",
      durationDays: "",
      isActive: true,
    },
  })

  useEffect(() => {
    fetchPlans()
  }, [])

  useEffect(() => {
    if (editingPlan) {
      form.reset({
        name: editingPlan.name,
        description: editingPlan.description,
        dailyInterest: editingPlan.dailyInterest,
        minAmount: editingPlan.minAmount,
        maxAmount: editingPlan.maxAmount,
        durationDays: editingPlan.durationDays.toString(),
        isActive: editingPlan.isActive,
      })
    } else {
      form.reset({
        name: "",
        description: "",
        dailyInterest: "",
        minAmount: "",
        maxAmount: "",
        durationDays: "",
        isActive: true,
      })
    }
  }, [editingPlan, form])

  async function fetchPlans() {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/plans")
      if (!response.ok) {
        throw new Error("Failed to fetch plans")
      }
      const data = await response.json()
      setPlans(data.data)
    } catch (err) {
      setError("Could not load plans")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function onSubmit(values: z.infer<typeof planSchema>) {
    setIsSubmitting(true)
    setError(null)

    try {
      const url = editingPlan ? `/api/admin/plans/${editingPlan.id}` : "/api/admin/plans"
      const method = editingPlan ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: values.name,
          description: values.description,
          dailyInterest: Number.parseFloat(values.dailyInterest),
          minAmount: Number.parseFloat(values.minAmount),
          maxAmount: Number.parseFloat(values.maxAmount),
          durationDays: Number.parseInt(values.durationDays),
          isActive: values.isActive,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save plan")
      }

      // Refresh plans list
      await fetchPlans()
      setDialogOpen(false)
      setEditingPlan(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function togglePlanStatus(plan: Plan) {
    try {
      const response = await fetch(`/api/admin/plans/${plan.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...plan,
          isActive: !plan.isActive,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update plan status")
      }

      // Refresh plans list
      await fetchPlans()
    } catch (err) {
      setError("Failed to update plan status")
      console.error(err)
    }
  }

  // Define columns for plans table
  const columns: ColumnDef<Plan>[] = [
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "dailyInterest",
      header: "Daily Interest",
      cell: ({ row }) => `${row.original.dailyInterest}%`,
    },
    {
      accessorKey: "minAmount",
      header: "Min Amount",
      cell: ({ row }) => `₹${formatCurrency(row.original.minAmount)}`,
    },
    {
      accessorKey: "maxAmount",
      header: "Max Amount",
      cell: ({ row }) => `₹${formatCurrency(row.original.maxAmount)}`,
    },
    {
      accessorKey: "durationDays",
      header: "Duration",
      cell: ({ row }) => `${row.original.durationDays} days`,
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <Switch
          checked={row.original.isActive}
          onCheckedChange={() => togglePlanStatus(row.original)}
          aria-label="Toggle plan status"
        />
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setEditingPlan(row.original)
            setDialogOpen(true)
          }}
        >
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Edit</span>
        </Button>
      ),
    },
  ]

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Investment Plans</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingPlan(null)}>
              <Plus className="mr-2 h-4 w-4" /> Add New Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{editingPlan ? "Edit Plan" : "Create New Plan"}</DialogTitle>
              <DialogDescription>
                {editingPlan
                  ? "Update the investment plan details below."
                  : "Fill in the details to create a new investment plan."}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Gold Plan" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="A short description of the investment plan" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="dailyInterest"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Daily Interest (%)</FormLabel>
                        <FormControl>
                          <Input placeholder="0.5" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="durationDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (Days)</FormLabel>
                        <FormControl>
                          <Input placeholder="30" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="minAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum Amount (₹)</FormLabel>
                        <FormControl>
                          <Input placeholder="1000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="maxAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maximum Amount (₹)</FormLabel>
                        <FormControl>
                          <Input placeholder="100000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active Status</FormLabel>
                        <FormDescription>Make this plan available to users for investment</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving
                      </>
                    ) : (
                      "Save Plan"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4 text-red-800">
          <div className="flex">
            <AlertCircle className="mr-2 h-5 w-5 text-red-400" />
            <p>{error}</p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Investment Plans</CardTitle>
          <CardDescription>Manage your investment plans and their settings.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-[400px] w-full" />
            </div>
          ) : (
            <DataTable columns={columns} data={plans} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
