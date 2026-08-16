import { NextRequest } from "next/server";
import { db } from "@/db";
import { tbChord } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/middleware";
import { successResponse, errorResponse } from "@/lib/api-response";
import { format } from "date-fns";

type Params = { params: Promise<{ judul: string; penyanyi: string }> };

function decodeParam(p: string) {
  return decodeURIComponent(p);
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { judul, penyanyi } = await params;
    const [song] = await db
      .select()
      .from(tbChord)
      .where(
        and(
          eq(tbChord.judul, decodeParam(judul)),
          eq(tbChord.penyanyi, decodeParam(penyanyi))
        )
      )
      .limit(1);

    if (!song) return errorResponse("Lagu tidak ditemukan", 404);
    return successResponse(song, "Berhasil");
  } catch (error) {
    console.error("GET /api/songs/[judul]/[penyanyi] error:", error);
    return errorResponse("Terjadi kesalahan server", 500);
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const authUser = await requireAuth(request);
    if (!authUser) return errorResponse("Tidak terautentikasi", 401);

    const { judul, penyanyi } = await params;
    const body = await request.json();

    const existing = await db
      .select()
      .from(tbChord)
      .where(
        and(
          eq(tbChord.judul, decodeParam(judul)),
          eq(tbChord.penyanyi, decodeParam(penyanyi))
        )
      )
      .limit(1);

    if (existing.length === 0) return errorResponse("Lagu tidak ditemukan", 404);

    const updateData: Partial<typeof tbChord.$inferInsert> = {
      lastmod: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
    };

    const fields = [
      "base_key",
      "album",
      "album_image",
      "isi_chord",
      "language",
      "youtube_url",
      "songwriter",
      "year",
      "songtype",
    ] as const;

    for (const field of fields) {
      if (field in body) {
        (updateData as Record<string, unknown>)[field] = body[field];
      }
    }

    const [updated] = await db
      .update(tbChord)
      .set(updateData)
      .where(
        and(
          eq(tbChord.judul, decodeParam(judul)),
          eq(tbChord.penyanyi, decodeParam(penyanyi))
        )
      )
      .returning();

    return successResponse(updated, "Lagu berhasil diperbarui");
  } catch (error) {
    console.error("PUT /api/songs/[judul]/[penyanyi] error:", error);
    return errorResponse("Terjadi kesalahan server", 500);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const authUser = await requireAuth(request);
    if (!authUser) return errorResponse("Tidak terautentikasi", 401);

    const { judul, penyanyi } = await params;

    const existing = await db
      .select()
      .from(tbChord)
      .where(
        and(
          eq(tbChord.judul, decodeParam(judul)),
          eq(tbChord.penyanyi, decodeParam(penyanyi))
        )
      )
      .limit(1);

    if (existing.length === 0) return errorResponse("Lagu tidak ditemukan", 404);

    await db
      .delete(tbChord)
      .where(
        and(
          eq(tbChord.judul, decodeParam(judul)),
          eq(tbChord.penyanyi, decodeParam(penyanyi))
        )
      );

    return successResponse(null, "Lagu berhasil dihapus");
  } catch (error) {
    console.error("DELETE /api/songs/[judul]/[penyanyi] error:", error);
    return errorResponse("Terjadi kesalahan server", 500);
  }
}
