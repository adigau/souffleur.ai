import { getUserPlays } from "@/lib/plays";
import LibraryDesktop from "@/components/library/LibraryDesktop";
import LibraryMobile from "@/components/library/LibraryMobile";

export default async function LibraryPage() {
  const plays = await getUserPlays();

  return (
    <>
      {/* Desktop */}
      <div className="lib-desktop" style={{ height: "100%", display: "none" }}>
        <LibraryDesktop plays={plays} />
      </div>

      {/* Mobile */}
      <div
        className="lib-mobile"
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <LibraryMobile plays={plays} />
      </div>

      <style>{`
        @media (min-width: 1024px) {
          .lib-desktop { display: block !important; }
          .lib-mobile { display: none !important; }
        }
      `}</style>
    </>
  );
}
