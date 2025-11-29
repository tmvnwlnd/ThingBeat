'use client';

type SynthKeyboardProps = {
  pressedKeys: Set<string>;
};

// Keyboard layout: white keys (bottom) and black keys (top)
const WHITE_KEYS = ['z', 'x', 'c', 'v', 'b', 'n', 'm', ','];
const BLACK_KEYS = ['s', 'd', '', 'g', 'h', 'j', '']; // Empty strings for gaps

export function SynthKeyboard({ pressedKeys }: SynthKeyboardProps) {
  return (
    <div className="relative h-[42px] w-[157px]">
      {/* Black keys (top row) */}
      <div className="absolute top-0 left-0 right-0 h-[20px] flex">
        {BLACK_KEYS.map((key, i) => {
          if (!key) {
            // Empty space (no black key)
            return <div key={i} className="flex-1" />;
          }
          const isPressed = pressedKeys.has(key.toLowerCase());
          return (
            <div
              key={i}
              className={`flex-1 flex items-center justify-center border border-white text-[14px] font-silkscreen ${
                isPressed
                  ? 'bg-thingbeat-blue text-white'
                  : 'bg-white text-thingbeat-blue'
              }`}
            >
              {key}
            </div>
          );
        })}
      </div>

      {/* White keys (bottom row) */}
      <div className="absolute bottom-0 left-0 right-0 h-[20px] flex">
        {WHITE_KEYS.map((key, i) => {
          const isPressed = pressedKeys.has(key.toLowerCase());
          return (
            <div
              key={i}
              className={`flex-1 flex items-center justify-center border border-white text-[14px] font-silkscreen ${
                isPressed
                  ? 'bg-white text-thingbeat-blue'
                  : 'bg-thingbeat-blue text-white'
              }`}
            >
              {key === ',' ? '<' : key}
            </div>
          );
        })}
      </div>
    </div>
  );
}
