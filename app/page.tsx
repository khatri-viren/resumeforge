import { ResumeBuilderClient } from "@/components/ResumeBuilderClient"
import { listDirectory, resolveSkillsDir } from "@/lib/fileLoaders"

export default async function Page() {
  const skillFiles = await listDirectory(resolveSkillsDir())
  return <ResumeBuilderClient skillFiles={skillFiles} />
}
