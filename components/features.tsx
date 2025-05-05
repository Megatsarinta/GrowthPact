import { Shield, TrendingUp, BarChart3, Clock, Users, CreditCard } from "lucide-react"

export function Features() {
  const features = [
    {
      icon: <Shield className="h-10 w-10 text-primary" />,
      title: "Secure Platform",
      description: "Bank-grade security with 2FA, encryption, and regular security audits.",
    },
    {
      icon: <TrendingUp className="h-10 w-10 text-primary" />,
      title: "Fixed Returns",
      description: "Predictable daily interest rates across all our investment plans.",
    },
    {
      icon: <BarChart3 className="h-10 w-10 text-primary" />,
      title: "Diverse Sectors",
      description: "Spread your investments across renewable energy, agriculture, real estate, and more.",
    },
    {
      icon: <Clock className="h-10 w-10 text-primary" />,
      title: "Flexible Terms",
      description: "Choose from various investment durations to match your financial goals.",
    },
    {
      icon: <Users className="h-10 w-10 text-primary" />,
      title: "Referral Program",
      description: "Earn bonuses by referring friends and family to our platform.",
    },
    {
      icon: <CreditCard className="h-10 w-10 text-primary" />,
      title: "Easy Deposits & Withdrawals",
      description: "Seamless process for adding funds and withdrawing your earnings.",
    },
  ]

  return (
    <section className="w-full py-12 md:py-24 lg:py-32 bg-primary/5">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Platform Features</h2>
            <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
              Discover why thousands of investors trust our platform for their financial growth.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-8">
          {features.map((feature, index) => (
            <div key={index} className="flex flex-col items-center text-center p-6 bg-background rounded-lg shadow-sm">
              <div className="mb-4">{feature.icon}</div>
              <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
              <p className="text-gray-500 dark:text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
