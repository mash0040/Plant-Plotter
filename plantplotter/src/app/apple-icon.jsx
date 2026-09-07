import { ImageResponse } from 'next/og';
import BrandMark from '@/components/BrandMark';

export const size = {
  width: 180,
  height: 180
};
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'center',
          background: '#14532d',
          color: '#ffffff',
          display: 'flex',
          height: '100%',
          justifyContent: 'center',
          width: '100%'
        }}
      >
        <BrandMark color="#ffffff" size={112} />
      </div>
    ),
    size
  );
}
