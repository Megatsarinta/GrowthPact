import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

// Sample investment plans data
const plans = [
  {
    id: 1,
    name: "Renewable Energy",
    dailyInterest: 0.5,
    minAmount: 10000,
    maxAmount: 100000,
    durationDays: 180,
    description: "Invest in solar and wind energy projects with stable returns.",
    sector: "Energy",
  },
  {
    id: 2,
    name: "Agriculture Growth",
    dailyInterest: 0.6,
    minAmount: 15000,
    maxAmount: 150000,
    durationDays: 240,
    description: "Support sustainable farming initiatives with competitive returns.",
    sector: "Agriculture",
  },
  {
    id: 3,
    name: "Real Estate Fund",
    dailyInterest: 0.7,
    minAmount: 25000,
    maxAmount: 250000,
    durationDays: 365,
    description: "Diversify your portfolio with premium real estate investments.",
    sector: "Real Estate",
  },
]

export function InvestmentPlans() {
  return (
    <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Investment Plans</h2>
            <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
              Choose from our diverse range of investment plans across different sectors.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {plans.map((plan) => (
            <Card key={plan.id} className="flex flex-col h-full">
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.sector}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Daily Interest:</span>
                    <span className="text-sm font-bold text-primary">{plan.dailyInterest}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Min Investment:</span>
                    <span className="text-sm">₹{plan.minAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Max Investment:</span>
                    <span className="text-sm">₹{plan.maxAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Duration:</span>
                    <span className="text-sm">{plan.durationDays} days</span>
                  </div>
                  <div className="pt-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{plan.description}</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Link href={`/plans/${plan.id}`} className="w-full">
                  <Button className="w-full">View Details</Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
        <div className="flex justify-center mt-8">
          <Link href="/plans">
            <Button variant="outline">View All Plans</Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
