"use client"

import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import type { Resume } from "@/lib/resumeSchema"

interface Props {
  atsScore: Resume["atsScore"]
}

export function ATSScorePanel({ atsScore }: Props) {
  const { matchedKeywords, missingKeywords, estimatedScore } = atsScore

  const scoreColor =
    estimatedScore >= 80
      ? "text-green-600 dark:text-green-400"
      : estimatedScore >= 60
        ? "text-yellow-600 dark:text-yellow-400"
        : "text-destructive"

  return (
    <div className="space-y-5 rounded border border-border bg-background p-5">
      {/* Score */}
      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          ATS Score
        </p>
        <p className={`mb-2 text-4xl font-bold tabular-nums ${scoreColor}`}>
          {estimatedScore}
          <span className="text-lg font-normal text-muted-foreground"> / 100</span>
        </p>
        <Progress value={estimatedScore} className="h-1.5" />
      </div>

      {/* Matched keywords */}
      {matchedKeywords.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium">
            Matched{" "}
            <span className="text-muted-foreground">({matchedKeywords.length})</span>
          </p>
          <div className="flex flex-wrap gap-1">
            {matchedKeywords.map((kw, i) => (
              <Badge
                key={i}
                className="border-green-200 bg-green-50 text-[10px] text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300"
              >
                {kw}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Missing keywords */}
      {missingKeywords.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium">
            Missing{" "}
            <span className="text-muted-foreground">({missingKeywords.length})</span>
          </p>
          <div className="flex flex-wrap gap-1">
            {missingKeywords.map((kw, i) => (
              <Badge key={i} variant="destructive" className="text-[10px]">
                {kw}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
