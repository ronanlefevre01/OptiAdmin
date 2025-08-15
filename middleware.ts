// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const user = process.env.OPTICOM_ADMIN_USER || ''
  const pass = process.env.OPTICOM_ADMIN_PASS || ''
  const expected = 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64')

  if (!user || !pass) return NextResponse.next() // si non config, ne bloque pas (dev)

  if (auth !== expected) {
    const res = new NextResponse('Authentication required', { status: 401 })
    res.headers.set('WWW-Authenticate', 'Basic realm="OptiAdmin"')
    return res
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next|static|favicon.ico).*)'],
}
