"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  CreditCard,
  PiggyBank,
  ArrowDownToLine,
  ArrowUpFromLine,
  History,
  Settings,
  ChevronDown,
  ChevronRight,
  Users,
  Shield,
  BarChart3,
  DollarSign,
} from "lucide-react"

interface SidebarProps {
  className?: string
  userRole?: string
}

export function Sidebar({ className, userRole = "user" }: SidebarProps) {
  const pathname = usePathname()
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    transactions: true,
    investments: true,
    admin: true,
  })

  const toggleMenu = (menu: string) => {
    setOpenMenus((prev) => ({
      ...prev,
      [menu]: !prev[menu],
    }))
  }

  const isActive = (path: string) => pathname === path

  const isAdmin = userRole === "admin"

  return (
    <div className={cn("pb-12", className)}>
      <div className="space-y-4 py-4">
        <div className="px-4 py-2">
          <h2 className="mb-2 px-2 text-lg font-semibold tracking-tight">Dashboard</h2>
          <div className="space-y-1">
            <Link
              href="/dashboard"
              className={cn(
                "flex items-center rounded-md px-2 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                isActive("/dashboard") && "bg-accent text-accent-foreground",
              )}
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              <span>Overview</span>
            </Link>

            {/* Transactions Menu */}
            <div>
              <button
                onClick={() => toggleMenu("transactions")}
                className="flex w-full items-center justify-between rounded-md px-2 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
              >
                <div className="flex items-center">
                  <CreditCard className="mr-2 h-4 w-4" />
                  <span>Transactions</span>
                </div>
                {openMenus.transactions ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              {openMenus.transactions && (
                <div className="ml-4 space-y-1 pt-1">
                  <Link
                    href="/dashboard/deposits"
                    className={cn(
                      "flex items-center rounded-md px-2 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                      isActive("/dashboard/deposits") && "bg-accent text-accent-foreground",
                    )}
                  >
                    <ArrowDownToLine className="mr-2 h-4 w-4" />
                    <span>Deposits</span>
                  </Link>
                  <Link
                    href="/dashboard/withdrawals"
                    className={cn(
                      "flex items-center rounded-md px-2 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                      isActive("/dashboard/withdrawals") && "bg-accent text-accent-foreground",
                    )}
                  >
                    <ArrowUpFromLine className="mr-2 h-4 w-4" />
                    <span>Withdrawals</span>
                  </Link>
                  <Link
                    href="/dashboard/interest-history"
                    className={cn(
                      "flex items-center rounded-md px-2 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                      isActive("/dashboard/interest-history") && "bg-accent text-accent-foreground",
                    )}
                  >
                    <History className="mr-2 h-4 w-4" />
                    <span>Interest History</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Investments Menu */}
            <div>
              <button
                onClick={() => toggleMenu("investments")}
                className="flex w-full items-center justify-between rounded-md px-2 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
              >
                <div className="flex items-center">
                  <PiggyBank className="mr-2 h-4 w-4" />
                  <span>Investments</span>
                </div>
                {openMenus.investments ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              {openMenus.investments && (
                <div className="ml-4 space-y-1 pt-1">
                  <Link
                    href="/dashboard/invest"
                    className={cn(
                      "flex items-center rounded-md px-2 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                      isActive("/dashboard/invest") && "bg-accent text-accent-foreground",
                    )}
                  >
                    <DollarSign className="mr-2 h-4 w-4" />
                    <span>Invest Now</span>
                  </Link>
                  <Link
                    href="/dashboard/investments"
                    className={cn(
                      "flex items-center rounded-md px-2 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                      isActive("/dashboard/investments") && "bg-accent text-accent-foreground",
                    )}
                  >
                    <BarChart3 className="mr-2 h-4 w-4" />
                    <span>My Investments</span>
                  </Link>
                </div>
              )}
            </div>

            <Link
              href="/dashboard/kyc"
              className={cn(
                "flex items-center rounded-md px-2 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                isActive("/dashboard/kyc") && "bg-accent text-accent-foreground",
              )}
            >
              <Shield className="mr-2 h-4 w-4" />
              <span>KYC Verification</span>
            </Link>

            <Link
              href="/dashboard/settings"
              className={cn(
                "flex items-center rounded-md px-2 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                isActive("/dashboard/settings") && "bg-accent text-accent-foreground",
              )}
            >
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </Link>
          </div>
        </div>

        {/* Admin Section */}
        {isAdmin && (
          <div className="px-4 py-2">
            <h2 className="mb-2 px-2 text-lg font-semibold tracking-tight">Admin</h2>
            <div className="space-y-1">
              <button
                onClick={() => toggleMenu("admin")}
                className="flex w-full items-center justify-between rounded-md px-2 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
              >
                <div className="flex items-center">
                  <Users className="mr-2 h-4 w-4" />
                  <span>Management</span>
                </div>
                {openMenus.admin ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              {openMenus.admin && (
                <div className="ml-4 space-y-1 pt-1">
                  <Link
                    href="/admin"
                    className={cn(
                      "flex items-center rounded-md px-2 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                      isActive("/admin") && "bg-accent text-accent-foreground",
                    )}
                  >
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                  <Link
                    href="/admin/users"
                    className={cn(
                      "flex items-center rounded-md px-2 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                      isActive("/admin/users") && "bg-accent text-accent-foreground",
                    )}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    <span>Users</span>
                  </Link>
                  <Link
                    href="/admin/plans"
                    className={cn(
                      "flex items-center rounded-md px-2 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                      isActive("/admin/plans") && "bg-accent text-accent-foreground",
                    )}
                  >
                    <PiggyBank className="mr-2 h-4 w-4" />
                    <span>Investment Plans</span>
                  </Link>
                  <Link
                    href="/admin/withdrawals"
                    className={cn(
                      "flex items-center rounded-md px-2 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                      isActive("/admin/withdrawals") && "bg-accent text-accent-foreground",
                    )}
                  >
                    <ArrowUpFromLine className="mr-2 h-4 w-4" />
                    <span>Withdrawals</span>
                  </Link>
                  <Link
                    href="/admin/interest-accrual"
                    className={cn(
                      "flex items-center rounded-md px-2 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                      isActive("/admin/interest-accrual") && "bg-accent text-accent-foreground",
                    )}
                  >
                    <History className="mr-2 h-4 w-4" />
                    <span>Interest Accrual</span>
                  </Link>
                  <Link
                    href="/admin/audit-logs"
                    className={cn(
                      "flex items-center rounded-md px-2 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                      isActive("/admin/audit-logs") && "bg-accent text-accent-foreground",
                    )}
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    <span>Audit Logs</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
