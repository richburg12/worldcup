import { ImageResponse } from 'next/og';

export const alt = 'We can just make shit now';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Social-share preview card (Open Graph + Twitter). Next.js auto-wires the tags.
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          backgroundColor: '#0c0a09',
          padding: '90px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 26, letterSpacing: 6, color: '#d97706', fontWeight: 700, marginBottom: 30 }}>
          STUFF RICHARD BUILT BECAUSE...
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', fontSize: 100, fontWeight: 800, color: '#fafaf9', lineHeight: 1.04 }}>
          <div style={{ display: 'flex' }}>We can just</div>
          <div style={{ display: 'flex' }}>
            make shit now<span style={{ color: '#d97706' }}>.</span>
          </div>
        </div>
        <div style={{ display: 'flex', marginTop: 40, fontSize: 30, color: '#a8a29e' }}>
          Tools and toys. Some for fun. Some for work.
        </div>
        <div style={{ display: 'flex', marginTop: 24, fontSize: 26, color: '#d97706', fontWeight: 600 }}>
          wecanjustmakeshitnow.com
        </div>
      </div>
    ),
    { ...size }
  );
}
