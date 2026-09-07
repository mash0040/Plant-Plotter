import { ImageResponse } from 'next/og';
import BrandMark from '@/components/BrandMark';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/siteMetadata';

export const alt = 'PlantPlotter garden planning workspace';
export const size = {
  width: 1200,
  height: 630
};
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'stretch',
          background: '#ecfdf5',
          color: '#172033',
          display: 'flex',
          fontFamily: 'Arial, sans-serif',
          height: '100%',
          padding: 48,
          width: '100%'
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '22px 46px 22px 8px',
            width: '43%'
          }}
        >
          <div style={{ alignItems: 'center', display: 'flex', gap: 14 }}>
            <div
              style={{
                alignItems: 'center',
                background: '#14532d',
                borderRadius: 14,
                color: '#ffffff',
                display: 'flex',
                fontSize: 34,
                fontWeight: 800,
                height: 64,
                justifyContent: 'center',
                width: 64
              }}
            >
              <BrandMark color="#ffffff" size={42} />
            </div>
            <span style={{ color: '#14532d', fontSize: 34, fontWeight: 800 }}>
              {SITE_NAME}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                color: '#172033',
                display: 'flex',
                flexDirection: 'column',
                fontSize: 58,
                fontWeight: 800,
                lineHeight: 1.05
              }}
            >
              <span>Plan, plant,</span>
              <span style={{ color: '#00a83f' }}>and track.</span>
            </div>
            <p
              style={{
                color: '#3f4b5f',
                fontSize: 23,
                lineHeight: 1.4,
                margin: '26px 0 0'
              }}
            >
              {SITE_DESCRIPTION}
            </p>
          </div>

          <span style={{ color: '#166534', fontSize: 20, fontWeight: 700 }}>
            plantplotter.me
          </span>
        </div>

        <div
          style={{
            background: '#14532d',
            borderRadius: 18,
            boxShadow: '0 18px 38px rgba(20, 83, 45, 0.22)',
            display: 'flex',
            overflow: 'hidden',
            padding: 12,
            width: '57%'
          }}
        >
          <img
            alt="Garden planner grid with planted crops"
            height="510"
            src={`${SITE_URL}/Garden_Planner.png`}
            style={{
              background: '#ffffff',
              borderRadius: 10,
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              width: '100%'
            }}
            width="612"
          />
        </div>
      </div>
    ),
    size
  );
}
