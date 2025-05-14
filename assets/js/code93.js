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
      '*',
   ];

   const ENCODINGS = [
      '100010100', '101001000', '101000100', '101000010',
      '100101000', '100100100', '100100010', '101010000',
      '100010010', '100001010', '110101000', '110100100',
      '110100010', '110010100', '110010010', '110001010',
      '101101000', '101100100', '101100010', '100110100',
      '100011010', '101011000', '101001100', '101000110',
      '100101100', '100010110', '110110100', '110110010',
      '110101100', '110100110', '110010110', '110011010',
      '101101100', '101100110', '100110110', '100111010',
      '100101110', '111010100', '111010010', '111001010',
      '101101110', '101110110', '110101110', '100100110',
      '111011010', '111010110', '100110010', '101011110',
   ];

   const charToValue = (c) => {
      return CHARACTERS.indexOf(c);
   };

   const charToEncoding = (c) => {
      return ENCODINGS[charToValue(c)];
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
      const encoded = text
         .map(c => charToEncoding(c))
         .join('');

      // Compute checksum characters
      const csumC = csum(text, 20);
      const csumK = csum(text.concat(csumC), 15);

      return [
         // Add the start bits
         charToEncoding('*') +
         // Add the encoded bits
         encoded +
         // Add the checksum
         charToEncoding(csumC) + charToEncoding(csumK) +
         // Add the stop bits
         charToEncoding('*') +
         // Add the termination bit
         '1'
      ].join('');
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
