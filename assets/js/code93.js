const Code93Barcode = (opts) => {
   if (typeof opts === 'string') {
      opts = {
         text: opts,
      };
   }

   if (opts.text.search(/^[0-9A-Z\-\.\ \$\/\+\%]+$/) !== 0) {
      throw new Error('Code 93 must only contain digits, capital letters,' +
                      ' spaces, and symbols -.$/+%');
   }
   const text = opts.text.split('');

   const CHARACTERS = [
      '0', '1', '2', '3',
      '4', '5', '6', '7',
      '8', '9', 'A', 'B',
      'C', 'D', 'E', 'F',
      'G', 'H', 'I', 'J',
      'K', 'L', 'M', 'N',
      'O', 'P', 'Q', 'R',
      'S', 'T', 'U', 'V',
      'W', 'X', 'Y', 'Z',
      '-', '.', ' ', '$',
      '/', '+', '%',
      // Only used for csum; Code 93 Extended not implemented
      '($)', '(%)', '(/)', '(+)',
      // Start/Stop
      null,
   ];

   const ENCODINGS = [
      0b100010100, 0b101001000, 0b101000100, 0b101000010,
      0b100101000, 0b100100100, 0b100100010, 0b101010000,
      0b100010010, 0b100001010, 0b110101000, 0b110100100,
      0b110100010, 0b110010100, 0b110010010, 0b110001010,
      0b101101000, 0b101100100, 0b101100010, 0b100110100,
      0b100011010, 0b101011000, 0b101001100, 0b101000110,
      0b100101100, 0b100010110, 0b110110100, 0b110110010,
      0b110101100, 0b110100110, 0b110010110, 0b110011010,
      0b101101100, 0b101100110, 0b100110110, 0b100111010,
      0b100101110, 0b111010100, 0b111010010, 0b111001010,
      0b101101110, 0b101110110, 0b110101110, 0b100100110,
      0b111011010, 0b111010110, 0b100110010, 0b101011110,
   ];

   const charToValue = (c) => {
      return CHARACTERS.indexOf(c);
   };

   const charToEncoding = (c) => {
      return ENCODINGS[charToValue(c)].toString(2);
   };

   const valueToChar = (value) => {
      return CHARACTERS[value];
   }

   const bitCount = () => {
      return ((text.length + 4) * 9) + 1;
   };

   const csum = (chars, maxWeight) => {
      const csum = chars.toReversed().reduce((sum, c, idx) => {
         let weight = (idx % maxWeight) + 1;
         return sum + (charToValue(c) * weight);
      }, 0);

      return valueToChar(csum % 47);
   }

   const toBinaryString = () => {
      // Start
      let s = charToEncoding(null);

      // Text characters
      for (const c of text) {
         s += charToEncoding(c);
      }

      // Csum characters (C and K)
      const C = csum(text, 20);
      s += charToEncoding(C);

      const K = csum(text.concat(C), 15);
      s += charToEncoding(K);

      // End
      s += charToEncoding(null);
      // Termination Bar
      s += '1';

      return s;
   };

   const toElements = function*() {
      let value = null;
      let bits = 0;
      for (const bit of toBinaryString()) {
         if (bit == value) {
            bits++;
            continue;
         }

         if (bits > 0) {
            yield {
               fill: value == '1',
               bits: bits,
            };
         }

         value = bit;
         bits = 1;
      }
      yield {
         fill: value == '1',
         bits: bits,
      };
   };

   const toSVG = (opts={}) => {
      const width = opts.width || 200;
      const height = opts.height || 50;
      const pad = opts.padding || 0;
      const fill = opts.fill || '#000';
      const bgfill = opts.bgfill;

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', width + (2 * pad));
      svg.setAttribute('height', height + (2 * pad));

      if (bgfill !== undefined) {
         const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
         rect.setAttribute('width', width + (2 * pad));
         rect.setAttribute('height', height + (2 * pad));
         rect.setAttribute('fill', bgfill);
         svg.appendChild(rect);
      }

      const bitWidth = width / bitCount();
      let x = pad;
      let commands = []
      for (const e of toElements()) {
         if (e.fill) {
            commands.push(`M${x} ${pad} v ${height} h ${e.bits * bitWidth} V ${pad} Z`);
         }
         x += e.bits * bitWidth;
      }
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', commands.join(' '));
      path.setAttribute('fill', fill);
      svg.appendChild(path);

      return svg;
   };

   return {
      toSVG: toSVG,
   };
};
