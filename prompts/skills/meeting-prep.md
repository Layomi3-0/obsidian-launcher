# Skill: Meeting Prep

Trigger: "Prep" action on a calendar event, or `/prep` command

Given a meeting, generate a prep sheet.

Inputs:
- Meeting title, time, attendees
- Related notes from vault (via semantic search on meeting title + attendees)
- Recent interaction history related to meeting topics

Output format:
1. **Context** (one line): What this meeting is about
2. **Key points from your notes**: Relevant facts from vault, cited with [[links]]
3. **Questions to consider**: 2-3 questions worth raising
4. **Related open loops**: Any unfinished tasks or threads connected to this topic

Keep it scannable. The user will glance at this 2 minutes before the meeting.
