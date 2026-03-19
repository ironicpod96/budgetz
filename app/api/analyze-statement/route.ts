import { generateText, Output } from 'ai'
import { z } from 'zod'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const takeHome = parseFloat(formData.get('takeHome') as string) || 0
    const categoriesJson = formData.get('categories') as string
    const categories = JSON.parse(categoriesJson) as string[]

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 })
    }

    // Read file content
    const fileContent = await file.text()

    const result = await generateText({
      model: 'google/gemini-2.0-flash',
      output: Output.object({
        schema: z.object({
          suggestions: z.array(z.object({
            category: z.string(),
            amount: z.number(),
            reasoning: z.string(),
          })),
          insights: z.string(),
        }),
      }),
      prompt: `You are a financial advisor helping allocate a monthly budget.

The user has a take-home salary of RM${takeHome.toFixed(2)} per month.

They want to allocate budget to these categories: ${categories.join(', ')}

Here is their bank statement data:
---
${fileContent.slice(0, 10000)}
---

Analyze their spending patterns and suggest optimal budget amounts for each category.
- Total suggested budget should not exceed 80% of take-home salary (leave 20% for savings)
- Base suggestions on their actual spending patterns
- Round amounts to nearest RM10

Respond with budget suggestions for each category and brief insights about their spending.`,
    })

    return Response.json(result.output)
  } catch (error) {
    console.error('Analysis error:', error)
    return Response.json(
      { error: 'Failed to analyze statement' },
      { status: 500 }
    )
  }
}
