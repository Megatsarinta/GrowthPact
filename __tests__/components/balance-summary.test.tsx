import { render, screen, waitFor } from "@testing-library/react"
import { BalanceSummary } from "@/components/dashboard/balance-summary"

// Mock fetch
global.fetch = jest.fn()

describe("BalanceSummary Component", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders loading state initially", () => {
    render(<BalanceSummary userId={1} />)

    expect(screen.getByText("Available Balance")).toBeInTheDocument()
    expect(screen.getByText("Total Invested")).toBeInTheDocument()
    expect(screen.getByText("Interest Earned")).toBeInTheDocument()
    expect(screen.getByText("Pending Transactions")).toBeInTheDocument()

    // Check for skeletons
    const skeletons = document.querySelectorAll(".skeleton")
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it("renders balance data when loaded successfully", async () => {
    const mockData = {
      data: {
        balanceInr: "10000.50",
        totalInvested: "50000.00",
        totalInterestEarned: "2500.75",
        pendingDeposits: "1000.00",
        pendingWithdrawals: "500.00",
      },
    }
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    })

    render(<BalanceSummary userId={1} />)

    await waitFor(() => {
      expect(screen.getByText("₹10,000.50")).toBeInTheDocument()
      expect(screen.getByText("₹50,000.00")).toBeInTheDocument()
      expect(screen.getByText("₹2,500.75")).toBeInTheDocument()
      expect(screen.getByText("₹1,500.00")).toBeInTheDocument() // Combined pending transactions
    })
  })

  it("renders error state when fetch fails", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    })

    render(<BalanceSummary userId={1} />)

    await waitFor(() => {
      expect(screen.getByText("Could not load balance data")).toBeInTheDocument()
    })
  })
})
