import { ImageResponse } from '@vercel/og';
import { mcpDataApi } from "@/lib/client/utils";

export const runtime = 'edge';
export const revalidate = 300;

function truncate(text: string, max = 180): string {
  if (!text) return "";
  return text.length > max ? text.slice(0, max - 1).trimEnd() + "…" : text;
}

function metric(label: string, value: string | number) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        padding: "16px 20px",
        borderRadius: 8,
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.15)",
        minWidth: 120,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 28, fontWeight: 600, lineHeight: 1, fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace" }}>{String(value)}</div>
      <div style={{ fontSize: 14, opacity: 0.7, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await mcpDataApi.getServerById(id);

    const name = (data?.info?.name || data?.origin || id || "Server").toString();
    const description = truncate((data?.info?.description || "").toString());
    const totalRequests = Number(data?.summary?.totalRequests || 0).toLocaleString();
    const totalTools = Number(data?.summary?.totalTools || 0).toLocaleString();
    const totalPayments = Number(data?.summary?.totalPayments || 0).toLocaleString();
    const quality = Number(data?.qualityScore || 0).toLocaleString();

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: 48,
            color: '#fff',
            background: '#0a0a0a',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}>
            <div style={{ fontSize: 42, fontWeight: 700, lineHeight: 1.1 }}>{name}</div>
            {description ? (
              <div style={{ fontSize: 18, opacity: 0.7, maxWidth: 800, lineHeight: 1.4 }}>{description}</div>
            ) : null}
          </div>

          {/* Metrics Grid */}
          <div style={{ display: "flex", gap: 20, marginBottom: 40 }}>
            {metric("Requests", totalRequests)}
            {metric("Tools", totalTools)}
            {metric("Payments", totalPayments)}
            {metric("Quality", quality)}
          </div>

          {/* Footer */}
          <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", opacity: 0.8, fontSize: 16 }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: "#14b8a6",
                }}
              />
              <div style={{ fontWeight: 500 }}>MCPay — Payments for MCPs</div>
            </div>
            
            {/* MCPay Symbol */}
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 12,
                background: "rgba(255,255,255,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: 0.8,
              }}
            >
              <svg
                width="48"
                height="48"
                viewBox="0 0 78 78"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect width="78" height="78" rx="15" fill="white"/>
                <g clipPath="url(#clip0_1438_2)">
                  <path d="M68.641 38.9422C66.5189 38.9289 64.3961 38.9099 62.2748 38.9571C61.5238 38.9738 61.3074 38.7487 61.3191 37.9795C61.3648 34.9671 61.3195 31.9534 61.3521 28.9407C61.3598 28.2341 61.169 27.9784 60.4412 28.0014C58.8273 28.0524 57.2122 28.0528 55.5959 28.0027C54.9271 27.9831 54.4768 28.2299 54.0244 28.6927C50.9809 31.8058 47.9234 34.9049 44.8519 37.99C44.6902 38.1531 44.5802 38.5068 44.2836 38.3902C43.9815 38.2714 44.1335 37.9358 44.1327 37.7023C44.1229 34.8175 44.0964 31.932 44.1482 29.0481C44.1632 28.2121 43.8638 27.9922 43.1074 28.0092C41.5245 28.0446 39.9409 28.0448 38.3567 28.0097C38.1254 28.0025 37.8944 28.0315 37.6717 28.0954C37.1551 28.139 36.6756 28.3847 36.3349 28.7805C33.2914 31.8936 30.2339 34.9927 27.1624 38.0778C27.0007 38.2409 26.8907 38.5946 26.5941 38.478C26.292 38.3593 26.444 38.0236 26.4432 37.7901C26.4334 34.9053 26.4069 32.0198 26.4587 29.1359C26.4737 28.2999 26.1743 28.08 25.418 28.097C23.835 28.1325 22.2514 28.1326 20.6672 28.0975C20.3533 28.0847 20.0404 28.1424 19.7511 28.2665C19.4618 28.3907 19.2032 28.5781 18.9938 28.8153C16.9988 30.8687 14.9875 32.9059 12.96 34.9269C11.6848 36.2016 10.3792 37.4451 9 38.7876C9.6007 39.1258 9.95778 39.0416 10.2976 39.0434C12.3564 39.0538 14.4153 39.0475 16.4742 39.0459C17.741 39.0449 17.7404 39.0441 17.7397 40.372C17.738 43.2569 17.7545 46.142 17.7229 49.0265C17.7155 49.7105 17.8729 50.0123 18.6149 49.9932C20.2925 49.9498 21.9723 49.9703 23.6507 49.9952C23.8867 49.9991 24.1208 49.9512 24.3367 49.8547C24.5527 49.7582 24.7455 49.6155 24.9018 49.4364C28.0253 46.2623 31.1542 43.0937 34.2886 39.9306C34.4312 39.7867 34.5155 39.4715 34.7819 39.5732C35.0961 39.693 34.9558 40.0133 34.9563 40.2507C34.9625 43.1675 34.9885 46.0847 34.9437 49.0008C34.9318 49.7787 35.1915 50.0135 35.9179 49.9994C37.5644 49.9675 39.212 49.975 40.8588 49.997C41.072 50.0026 41.2846 49.9704 41.487 49.9019C41.9117 49.8683 42.3072 49.6701 42.5913 49.3486C45.7148 46.1745 48.8437 43.0059 51.9781 39.8428C52.1207 39.6989 52.205 39.3837 52.4714 39.4854C52.7856 39.6052 52.6453 39.9254 52.6458 40.1629C52.6521 43.0797 52.678 45.9969 52.6333 48.913C52.6213 49.6908 52.8809 49.9257 53.6074 49.9116C55.2539 49.8797 56.9015 49.8872 58.5482 49.9092C58.7987 49.9199 59.0484 49.8747 59.2796 49.7768C59.5109 49.6789 59.7181 49.5307 59.8865 49.3427C62.2627 46.9087 64.653 44.4889 67.0575 42.0833C68.0116 41.1252 68.9945 40.1964 70 39.2196C69.4573 38.8201 69.0335 38.9447 68.641 38.9422Z" fill="black"/>
                </g>
                <defs>
                  <clipPath id="clip0_1438_2">
                    <rect width="61" height="22" fill="white" transform="translate(9 28)"/>
                  </clipPath>
                </defs>
              </svg>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            background: 'linear-gradient(135deg, #0b0f1a 0%, #171c2c 50%, #0f1322 100%)',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          }}
        >
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 40, fontWeight: 800, marginBottom: 12 }}>Server</div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  }
}
