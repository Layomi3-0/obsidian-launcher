# Skill: YouTube Transcript

Trigger: User pastes a YouTube URL (youtube.com, youtu.be) or asks about a video transcript

## Workflow

1. Use `fetch_youtube_transcript` with the YouTube URL to get the transcript
2. Read the transcript and any additional context the user provides
3. Take the appropriate action:

### If the user wants a note created:
- Use `create_note` with a clean, descriptive title based on the video content
- Structure the note with:
  - Frontmatter: `source`, `type: video`, `created` date
  - A brief summary of the video (3-5 sentences)
  - Key takeaways as bullet points
  - The full transcript under a collapsible section (`> [!transcript]- Full Transcript`)
- Place in the folder the user specifies, or `Resources/Videos/` by default

### If the user wants to append to an existing note:
- Use `append_to_note` with a formatted section including the video link and relevant excerpts

### If the user just wants information:
- Summarize the transcript and answer their question directly
- Reference timestamps so they can jump to relevant parts

## Formatting

- Always include the video URL as a source link
- Use timestamps like `[12:34]` when referencing specific moments
- Keep summaries concise — the user can always read the full transcript in the note
