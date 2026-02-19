import React from "react";

export type PDFReference = {
  id: string;
  imageUrl: string;
  board: string;
  notes?: string;
  tags: {
    style: string[];
    colors: string[];
    contentType: string[];
    mood: string[];
    ai: string[];
  };
};

function getUniqueColors(references: PDFReference[]): string[] {
  const seen = new Set<string>();
  const colors: string[] = [];
  for (const ref of references) {
    for (const c of ref.tags.colors) {
      if (!seen.has(c)) {
        seen.add(c);
        colors.push(c);
      }
    }
  }
  return colors.slice(0, 18);
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

export async function exportMoodboardPDF(
  references: PDFReference[],
  projectName = "Studio Moodboard"
): Promise<void> {
  const { pdf, Document, Page, View, Text, Image, StyleSheet } =
    await import("@react-pdf/renderer");

  const colors = getUniqueColors(references);
  const date = formatDate();
  const perPage = 9;
  const pages: PDFReference[][] = [];
  for (let i = 0; i < references.length; i += perPage) {
    pages.push(references.slice(i, i + perPage));
  }

  const s = StyleSheet.create({
    coverPage: {
      backgroundColor: "#ffffff",
      padding: 60,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      position: "relative",
    },
    gridPage: {
      backgroundColor: "#ffffff",
      padding: 32,
      position: "relative",
    },
    palettePage: {
      backgroundColor: "#ffffff",
      padding: 60,
      position: "relative",
    },
    accentBar: {
      width: 40,
      height: 3,
      backgroundColor: "#111111",
      marginBottom: 28,
    },
    coverTitle: {
      fontSize: 52,
      fontFamily: "Helvetica-Bold",
      color: "#111111",
      marginBottom: 10,
    },
    coverMeta: {
      fontSize: 13,
      fontFamily: "Helvetica",
      color: "#888888",
      marginBottom: 40,
    },
    paletteStripWrap: {
      flexDirection: "row",
      height: 6,
      marginBottom: 0,
    },
    paletteSlice: {
      flex: 1,
      height: 6,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    gridItem: {
      width: "31.8%",
      marginRight: "2.3%",
      marginBottom: 16,
    },
    gridItemLast: {
      marginRight: 0,
    },
    gridImage: {
      width: "100%",
      height: 150,
      backgroundColor: "#eeeeee",
      objectFit: "cover",
    },
    gridPlaceholder: {
      width: "100%",
      height: 150,
      backgroundColor: "#eeeeee",
      alignItems: "center",
      justifyContent: "center",
    },
    gridLabel: {
      fontSize: 7,
      fontFamily: "Helvetica",
      color: "#555555",
      marginTop: 4,
    },
    gridTags: {
      fontSize: 6,
      fontFamily: "Helvetica",
      color: "#aaaaaa",
      marginTop: 2,
    },
    sectionTitle: {
      fontSize: 26,
      fontFamily: "Helvetica-Bold",
      color: "#111111",
      marginBottom: 28,
    },
    swatchRow: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    swatchItem: {
      marginRight: 20,
      marginBottom: 20,
      alignItems: "center",
    },
    swatch: {
      width: 72,
      height: 72,
    },
    hexLabel: {
      fontSize: 7,
      fontFamily: "Helvetica",
      color: "#777777",
      marginTop: 5,
      textAlign: "center",
    },
    footer: {
      fontSize: 7,
      fontFamily: "Helvetica",
      color: "#cccccc",
      textAlign: "center",
      position: "absolute",
      bottom: 20,
      left: 0,
      right: 0,
    },
    pageNum: {
      fontSize: 7,
      fontFamily: "Helvetica",
      color: "#cccccc",
      position: "absolute",
      bottom: 20,
      right: 32,
    },
  });

  const doc = (
    <Document title={projectName} author="Studio OS">
      {/* ── Cover page ── */}
      <Page size="A4" orientation="landscape" style={s.coverPage}>
        <View style={s.accentBar} />
        <View>
          <Text style={s.coverTitle}>{projectName}</Text>
          <Text style={s.coverMeta}>
            {references.length} reference{references.length !== 1 ? "s" : ""} ·{" "}
            Generated {date}
          </Text>
        </View>
        {colors.length > 0 && (
          <View style={s.paletteStripWrap}>
            {colors.map((c) => (
              <View key={c} style={[s.paletteSlice, { backgroundColor: c }]} />
            ))}
          </View>
        )}
        <Text style={s.footer}>Created with Studio OS · Page 1</Text>
      </Page>

      {/* ── Grid pages ── */}
      {pages.map((pageRefs, pi) => (
        <Page
          key={`grid-${pi}`}
          size="A4"
          orientation="landscape"
          style={s.gridPage}
        >
          <View style={s.grid}>
            {pageRefs.map((ref, ri) => {
              const isBlob = ref.imageUrl.startsWith("blob:");
              const allTags = [
                ...ref.tags.ai.slice(0, 2),
                ...ref.tags.style.slice(0, 1),
                ...ref.tags.mood.slice(0, 1),
              ]
                .filter(Boolean)
                .join(" · ");

              return (
                <View
                  key={ref.id}
                  style={[s.gridItem, (ri + 1) % 3 === 0 ? s.gridItemLast : {}]}
                >
                  {isBlob ? (
                    <View style={s.gridPlaceholder}>
                      <Text style={{ fontSize: 7, color: "#bbbbbb" }}>
                        Local image
                      </Text>
                    </View>
                  ) : (
                    <Image src={ref.imageUrl} style={s.gridImage} />
                  )}
                  {ref.notes ? (
                    <Text style={s.gridLabel}>{ref.notes.slice(0, 60)}</Text>
                  ) : null}
                  {allTags ? (
                    <Text style={s.gridTags}>{allTags.slice(0, 80)}</Text>
                  ) : null}
                </View>
              );
            })}
          </View>
          <Text style={s.footer}>Created with Studio OS</Text>
          <Text style={s.pageNum}>{pi + 2}</Text>
        </Page>
      ))}

      {/* ── Color palette page ── */}
      {colors.length > 0 && (
        <Page size="A4" orientation="landscape" style={s.palettePage}>
          <Text style={s.sectionTitle}>Color Palette</Text>
          <View style={s.swatchRow}>
            {colors.map((c) => (
              <View key={c} style={s.swatchItem}>
                <View style={[s.swatch, { backgroundColor: c }]} />
                <Text style={s.hexLabel}>{c}</Text>
              </View>
            ))}
          </View>
          <Text style={s.footer}>Created with Studio OS</Text>
          <Text style={s.pageNum}>{pages.length + 2}</Text>
        </Page>
      )}
    </Document>
  );

  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(projectName)}-moodboard.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
