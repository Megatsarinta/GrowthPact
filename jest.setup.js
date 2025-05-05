// This file is used to set up the test environment

// Mock Next.js response and request
jest.mock("next/server", () => {
  const originalModule = jest.requireActual("next/server")
  return {
    ...originalModule,
    NextResponse: {
      ...originalModule.NextResponse,
      json: jest.fn((data, init) => {
        return {
          status: init?.status || 200,
          json: async () => data,
          headers: new Map(),
        }
      }),
      redirect: jest.fn((url) => {
        return {
          status: 302,
          headers: new Map([["Location", url.toString()]]),
        }
      }),
    },
  }
})

// Mock nanoid
jest.mock("nanoid", () => ({
  nanoid: jest.fn(() => "test-nanoid"),
}))

// Mock QRCode
jest.mock("qrcode", () => ({
  toDataURL: jest.fn().mockResolvedValue("data:image/png;base64,mockQRCode"),
}))

// Global beforeEach
beforeEach(() => {
  jest.clearAllMocks()
})
