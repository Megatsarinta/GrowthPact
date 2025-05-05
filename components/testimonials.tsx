import Image from "next/image"

export function Testimonials() {
  const testimonials = [
    {
      name: "Rajesh Kumar",
      role: "Small Business Owner",
      content:
        "I've been investing with InvestSafe for over a year now. The fixed returns have helped me plan my finances better, and the platform is incredibly easy to use.",
      avatar: "/placeholder.svg?height=80&width=80",
    },
    {
      name: "Priya Sharma",
      role: "IT Professional",
      content:
        "What I appreciate most about InvestSafe is the transparency. I always know exactly what returns to expect and when. Their customer service is also exceptional.",
      avatar: "/placeholder.svg?height=80&width=80",
    },
    {
      name: "Amit Patel",
      role: "Retired Teacher",
      content:
        "After retirement, I was looking for stable investment options. InvestSafe's fixed interest plans have provided me with the security and returns I needed.",
      avatar: "/placeholder.svg?height=80&width=80",
    },
  ]

  return (
    <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">What Our Investors Say</h2>
            <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
              Hear from our community of investors about their experience with our platform.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="flex flex-col items-center text-center p-6 bg-primary/5 rounded-lg">
              <div className="relative w-16 h-16 mb-4 rounded-full overflow-hidden">
                <Image
                  src={testimonial.avatar || "/placeholder.svg"}
                  alt={testimonial.name}
                  fill
                  className="object-cover"
                />
              </div>
              <p className="mb-4 text-gray-500 dark:text-gray-400">"{testimonial.content}"</p>
              <h4 className="text-lg font-bold">{testimonial.name}</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">{testimonial.role}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
