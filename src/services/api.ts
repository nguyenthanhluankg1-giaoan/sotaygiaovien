
import { Level, QuizResponse } from "../types";

export async function fetchQuiz(level: Level): Promise<QuizResponse> {
  const response = await fetch("/api/generate-quiz", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ level }),
  });

  if (!response.ok) {
    throw new Error("Không thể tải bộ đề thi. Vui lòng thử lại.");
  }

  return response.json();
}
