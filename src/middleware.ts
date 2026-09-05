import { NextResponse, type NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const path = url.pathname;

  const roomPage = path.match(/^\/r\/([A-Za-z0-9]+)$/);
  if (roomPage) {
    url.pathname = "/room";
    url.searchParams.set("code", roomPage[1].toUpperCase());
    return NextResponse.rewrite(url);
  }

  const stream = path.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/stream$/);
  if (stream && !["new", "stream"].includes(stream[1].toLowerCase())) {
    url.pathname = "/api/rooms/stream";
    url.searchParams.set("code", stream[1].toUpperCase());
    return NextResponse.rewrite(url);
  }

  const roomApi = path.match(/^\/api\/rooms\/([A-Za-z0-9]+)$/);
  if (roomApi && !["new", "stream"].includes(roomApi[1].toLowerCase())) {
    url.pathname = "/api/room";
    url.searchParams.set("code", roomApi[1].toUpperCase());
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/r/:path*", "/api/rooms/:path*"],
};
