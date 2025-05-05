/**
 * Seed data for the investment platform
 *
 * This file contains sample data for development and testing purposes.
 * It includes investment projects, plans, and admin users.
 */

import { investmentProjects, investmentPlans, users } from "./schema"
import { db } from "./index"
import bcrypt from "bcrypt"
import { BCRYPT_SALT_ROUNDS } from "@/app/api/env-config"

// Function to seed the database with initial data
export async function seedDatabase() {
  try {
    console.log("Starting database seeding...")

    // Create admin user
    const adminPasswordHash = await bcrypt.hash("admin123", BCRYPT_SALT_ROUNDS)
    await db
      .insert(users)
      .values({
        email: "admin@investsafe.com",
        passwordHash: adminPasswordHash,
        fullName: "Admin User",
        isVerified: true,
        role: "admin",
      })
      .onConflictDoNothing()
    console.log("Admin user created")

    // Seed investment projects
    const projectsData = [
      {
        name: "Solar Energy Farms",
        description:
          "Investment in large-scale solar energy farms across India, generating clean electricity for thousands of homes and businesses.",
        imageUrl: "/images/projects/solar-energy.jpg",
        sector: "Renewable Energy",
      },
      {
        name: "Wind Power Generation",
        description:
          "Funding for wind turbine installations in high-wind coastal regions, providing sustainable power to the national grid.",
        imageUrl: "/images/projects/wind-power.jpg",
        sector: "Renewable Energy",
      },
      {
        name: "Organic Farming Collective",
        description:
          "Supporting a network of organic farmers producing pesticide-free crops using sustainable agricultural practices.",
        imageUrl: "/images/projects/organic-farming.jpg",
        sector: "Agriculture",
      },
      {
        name: "Hydroponic Farming Technology",
        description:
          "Investment in advanced hydroponic farming systems that use 90% less water than traditional farming methods.",
        imageUrl: "/images/projects/hydroponic-farming.jpg",
        sector: "Agriculture",
      },
      {
        name: "Commercial Real Estate Development",
        description:
          "Funding for premium office spaces and retail developments in major metropolitan areas with high rental yield potential.",
        imageUrl: "/images/projects/commercial-real-estate.jpg",
        sector: "Real Estate",
      },
      {
        name: "Affordable Housing Initiative",
        description:
          "Development of quality affordable housing in urban areas, addressing housing shortages while providing stable returns.",
        imageUrl: "/images/projects/affordable-housing.jpg",
        sector: "Real Estate",
      },
      {
        name: "Highway Infrastructure Expansion",
        description:
          "Investment in critical highway infrastructure projects connecting major industrial hubs and improving logistics networks.",
        imageUrl: "/images/projects/highway-infrastructure.jpg",
        sector: "Infrastructure",
      },
      {
        name: "Urban Metro Development",
        description:
          "Funding for metro rail projects in congested urban centers, reducing traffic and providing efficient public transportation.",
        imageUrl: "/images/projects/urban-metro.jpg",
        sector: "Infrastructure",
      },
      {
        name: "Tech Startup Accelerator",
        description:
          "Supporting promising technology startups with high growth potential in AI, fintech, and healthcare sectors.",
        imageUrl: "/images/projects/tech-startup.jpg",
        sector: "SME",
      },
      {
        name: "Manufacturing SME Fund",
        description:
          "Investment in small and medium manufacturing enterprises producing essential goods with established market demand.",
        imageUrl: "/images/projects/manufacturing-sme.jpg",
        sector: "SME",
      },
    ]

    // Insert projects
    for (const project of projectsData) {
      await db.insert(investmentProjects).values(project).onConflictDoNothing()
    }
    console.log("Investment projects created")

    // Get all projects to reference in plans
    const projects = await db.select().from(investmentProjects)

    // Seed investment plans
    const plansData = [
      {
        name: "Green Energy Starter",
        dailyInterest: 0.5,
        minAmount: 10000,
        maxAmount: 100000,
        durationDays: 180,
        projectId: projects.find((p) => p.name === "Solar Energy Farms")?.id || 1,
      },
      {
        name: "Renewable Power Plus",
        dailyInterest: 0.6,
        minAmount: 25000,
        maxAmount: 250000,
        durationDays: 270,
        projectId: projects.find((p) => p.name === "Wind Power Generation")?.id || 2,
      },
      {
        name: "Sustainable Agriculture Fund",
        dailyInterest: 0.55,
        minAmount: 15000,
        maxAmount: 150000,
        durationDays: 210,
        projectId: projects.find((p) => p.name === "Organic Farming Collective")?.id || 3,
      },
      {
        name: "Future Farming Initiative",
        dailyInterest: 0.65,
        minAmount: 20000,
        maxAmount: 200000,
        durationDays: 240,
        projectId: projects.find((p) => p.name === "Hydroponic Farming Technology")?.id || 4,
      },
      {
        name: "Premium Property Portfolio",
        dailyInterest: 0.7,
        minAmount: 50000,
        maxAmount: 500000,
        durationDays: 365,
        projectId: projects.find((p) => p.name === "Commercial Real Estate Development")?.id || 5,
      },
      {
        name: "Urban Housing Development",
        dailyInterest: 0.6,
        minAmount: 30000,
        maxAmount: 300000,
        durationDays: 300,
        projectId: projects.find((p) => p.name === "Affordable Housing Initiative")?.id || 6,
      },
      {
        name: "Infrastructure Growth Fund",
        dailyInterest: 0.55,
        minAmount: 25000,
        maxAmount: 250000,
        durationDays: 270,
        projectId: projects.find((p) => p.name === "Highway Infrastructure Expansion")?.id || 7,
      },
    ]

    // Insert plans
    for (const plan of plansData) {
      await db.insert(investmentPlans).values(plan).onConflictDoNothing()
    }
    console.log("Investment plans created")

    console.log("Database seeding completed successfully")
  } catch (error) {
    console.error("Error seeding database:", error)
    throw error
  }
}
