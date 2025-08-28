import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { promises as fs } from 'fs'

export const runtime = 'nodejs'
export const dynamic = 'error'

interface ExerciseSearchQuery {
  id: string
  name: string
  search_queries: string[]
}

interface ExerciseSearchData {
  exercise_search_queries: ExerciseSearchQuery[]
}

class VideoSearchError extends Error {
  code: 'missing_api_key' | 'quota_exceeded' | 'upstream_error' | 'no_results' | 'no_queries'
  status: number
  constructor(code: VideoSearchError['code'], message: string, status: number) {
    super(message)
    this.code = code
    this.status = status
  }
}



export async function POST(request: NextRequest) {
  try {
    const { exerciseId, exerciseName } = await request.json()

    if (!exerciseId && !exerciseName) {
      return NextResponse.json(
        { error: 'Either exerciseId or exerciseName is required' },
        { status: 400 }
      )
    }

    // Load exercise search queries from manifest (read from public folder)
    const manifestPath = path.join(process.cwd(), 'public', 'manifest.json')
    const manifestRaw = await fs.readFile(manifestPath, 'utf8')
    const manifest = JSON.parse(manifestRaw) as { files: { exercise_search_queries: string } }

    const queriesPath = path.join(process.cwd(), 'public', manifest.files.exercise_search_queries)
    const queriesRaw = await fs.readFile(queriesPath, 'utf8')
    const exerciseSearchData = JSON.parse(queriesRaw) as ExerciseSearchData
    
    // Find the exercise search queries
    let searchQueries: string[] = []
    if (exerciseId) {
      const exerciseData = exerciseSearchData.exercise_search_queries.find(
        exercise => exercise.id === exerciseId
      )
      searchQueries = exerciseData?.search_queries || []
    }

    // Fallback to generic search if no specific queries found
    if (searchQueries.length === 0 && exerciseName) {
      searchQueries = [
        `${exerciseName} form tutorial`,
        `${exerciseName} technique`,
        `how to do ${exerciseName}`
      ]
    }

    if (searchQueries.length === 0) {
      throw new VideoSearchError('no_queries', 'No search queries found for exercise', 404)
    }

    // Perform YouTube API search
    const videos = await searchYouTubeVideos(searchQueries)

    return NextResponse.json({ videos: videos.slice(0, 3) })

  } catch (error) {
    console.error('YouTube search error:', error)
    if (error instanceof VideoSearchError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function searchYouTubeVideos(searchQueries: string[]): Promise<string[]> {
  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY
  
  if (!YOUTUBE_API_KEY) {
    console.warn('YOUTUBE_API_KEY not found in environment variables')
    throw new VideoSearchError('missing_api_key', 'Video search is temporarily unavailable. Try again later.', 503)
  }

  try {
    const allVideos: string[] = []
    
    // Search for each query and collect videos
    for (const query of searchQueries.slice(0, 2)) { // Limit to 2 queries to stay within API limits
      // First, search for Shorts specifically
      const shortsSearchUrl = `https://www.googleapis.com/youtube/v3/search?` +
        `part=snippet&` +
        `q=${encodeURIComponent(query + ' shorts')}&` +
        `type=video&` +
        `videoDuration=short&` + // Prefer shorter videos
        `maxResults=3&` +
        `key=${YOUTUBE_API_KEY}`
      
      // Also search for regular videos as fallback
      const regularSearchUrl = `https://www.googleapis.com/youtube/v3/search?` +
        `part=snippet&` +
        `q=${encodeURIComponent(query)}&` +
        `type=video&` +
        `videoDuration=short&` + // Prefer shorter videos
        `maxResults=3&` +
        `key=${YOUTUBE_API_KEY}`
      
      // Try Shorts first, then regular videos
      const searchUrls = [shortsSearchUrl, regularSearchUrl]
      
      for (const searchUrl of searchUrls) {
        try {
          const response = await fetch(searchUrl)
          
          if (!response.ok) {
            let reason: string | undefined
            try {
              const errBody = await response.json()
              reason = errBody?.error?.errors?.[0]?.reason || errBody?.error?.status || errBody?.error?.message
            } catch {
              // ignore parse errors
            }
            if (response.status === 403 && (reason?.toLowerCase().includes('quota') || reason === 'quotaExceeded' || reason === 'RATE_LIMIT_EXCEEDED' || reason === 'RESOURCE_EXHAUSTED')) {
              throw new VideoSearchError('quota_exceeded', 'Search limit reached. Try again tomorrow.', 429)
            }
            // Continue to next search URL instead of failing completely
            continue
          }

          const data = await response.json()
          
          if (data.items && data.items.length > 0) {
            const videoUrls = data.items.map((item: { id: { videoId: string } }) => 
              `https://www.youtube.com/watch?v=${item.id.videoId}`
            )
            allVideos.push(...videoUrls)
            // If we found videos, break out of the searchUrls loop for this query
            break
          }
        } catch (searchError) {
          // Continue to next search URL if this one fails
          console.error(`Search failed for ${searchUrl}:`, searchError)
          continue
        }
      }
    }
    
    // Remove duplicates and return up to 3 videos
    const uniqueVideos = [...new Set(allVideos)]
    
    if (uniqueVideos.length === 0) {
      throw new VideoSearchError('no_results', 'No videos found for this exercise. Try again later.', 404)
    }

    return uniqueVideos.slice(0, 3)

  } catch (error) {
    if (error instanceof VideoSearchError) throw error
    console.error('YouTube API call failed:', error)
    throw new VideoSearchError('upstream_error', 'Video search failed. Try again later.', 502)
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST instead.' },
    { status: 405 }
  )
}
