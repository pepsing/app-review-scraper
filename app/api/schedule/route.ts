import { NextResponse } from "next/server"
import { checkAndRunScheduledTasks } from "@/lib/scheduler"

export async function POST(request: Request) {
  try {
    // 验证请求是否包含有效的 API 密钥（在实际应用中应该添加）
    // const { authorization } = request.headers
    // if (!isValidApiKey(authorization)) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    // }

    // 运行调度任务
    await checkAndRunScheduledTasks()

    return NextResponse.json({
      success: true,
      message: "Scheduled tasks completed successfully"
    })
  } catch (error) {
    console.error("Error running scheduled tasks:", error)
    return NextResponse.json(
      { error: "Failed to run scheduled tasks" },
      { status: 500 }
    )
  }
}