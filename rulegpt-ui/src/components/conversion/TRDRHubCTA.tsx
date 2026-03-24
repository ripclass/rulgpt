import { ArrowUpRight } from 'lucide-react'

interface TRDRHubCTAProps {
  text?: string | null
  url?: string | null
}

const DEFAULT_TEXT =
  'Need to validate an actual LC document? LCopilot on TRDR Hub validates in 47 seconds. Your first 5 validations are free. ->'

export function TRDRHubCTA({ text, url }: TRDRHubCTAProps) {
  return (
    <a
      href={url ?? 'https://trdrhub.com'}
      target="_blank"
      rel="noreferrer"
      className="mt-3 flex items-center justify-between border border-primary/20 bg-[#fff7f1] px-4 py-3 text-left text-xs text-primary transition hover:border-primary/40 hover:bg-[#ffefe6]"
    >
      <span className="pr-3 leading-6">{text ?? DEFAULT_TEXT}</span>
      <ArrowUpRight className="ml-2 h-4 w-4 shrink-0" />
    </a>
  )
}
