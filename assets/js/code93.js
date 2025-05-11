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

   const LOOKUP_TABLE = {
      '0':   {encoding: 0b100010100, value: 0},
      '1':   {encoding: 0b101001000, value: 1},
      '2':   {encoding: 0b101000100, value: 2},
      '3':   {encoding: 0b101000010, value: 3},
      '4':   {encoding: 0b100101000, value: 4},
      '5':   {encoding: 0b100100100, value: 5},
      '6':   {encoding: 0b100100010, value: 6},
      '7':   {encoding: 0b101010000, value: 7},
      '8':   {encoding: 0b100010010, value: 8},
      '9':   {encoding: 0b100001010, value: 9},
      'A':   {encoding: 0b110101000, value: 10},
      'B':   {encoding: 0b110100100, value: 11},
      'C':   {encoding: 0b110100010, value: 12},
      'D':   {encoding: 0b110010100, value: 13},
      'E':   {encoding: 0b110010010, value: 14},
      'F':   {encoding: 0b110001010, value: 15},
      'G':   {encoding: 0b101101000, value: 16},
      'H':   {encoding: 0b101100100, value: 17},
      'I':   {encoding: 0b101100010, value: 18},
      'J':   {encoding: 0b100110100, value: 19},
      'K':   {encoding: 0b100011010, value: 20},
      'L':   {encoding: 0b101011000, value: 21},
      'M':   {encoding: 0b101001100, value: 22},
      'N':   {encoding: 0b101000110, value: 23},
      'O':   {encoding: 0b100101100, value: 24},
      'P':   {encoding: 0b100010110, value: 25},
      'Q':   {encoding: 0b110110100, value: 26},
      'R':   {encoding: 0b110110010, value: 27},
      'S':   {encoding: 0b110101100, value: 28},
      'T':   {encoding: 0b110100110, value: 29},
      'U':   {encoding: 0b110010110, value: 30},
      'V':   {encoding: 0b110011010, value: 31},
      'W':   {encoding: 0b101101100, value: 32},
      'X':   {encoding: 0b101100110, value: 33},
      'Y':   {encoding: 0b100110110, value: 34},
      'Z':   {encoding: 0b100111010, value: 35},
      '-':   {encoding: 0b100101110, value: 36},
      '.':   {encoding: 0b111010100, value: 37},
      ' ':   {encoding: 0b111010010, value: 38},
      '$':   {encoding: 0b111001010, value: 39},
      '/':   {encoding: 0b101101110, value: 40},
      '+':   {encoding: 0b101110110, value: 41},
      '%':   {encoding: 0b110101110, value: 42},
      // Only used for csum; Code 93 Extended not implemented
      '($)': {encoding: 0b100100110, value: 43},
      '(%)': {encoding: 0b111011010, value: 44},
      '(/)': {encoding: 0b111010110, value: 45},
      '(+)': {encoding: 0b100110010, value: 46},
      // Start/Stop
      null:   {encoding: 0b101011110, value: undefined},
   };

   const bitCount = () => {
      return ((text.length + 4) * 9) + 1;
   };

   const csum = (chars, maxWeight) => {
      const csum = chars.toReversed().reduce((sum, c, idx) => {
         let weight = (idx % maxWeight) + 1;
         return sum + (LOOKUP_TABLE[c].value * weight);
      }, 0);

      for (const [k, v] of Object.entries(LOOKUP_TABLE)) {
         if (LOOKUP_TABLE[k].value == (csum % 47)) {
            return k;
         }
      }
   }

   const toBinaryString = () => {
      // Start
      let s = LOOKUP_TABLE[null].encoding.toString(2);

      // Text characters
      for (const c of text) {
         s += LOOKUP_TABLE[c].encoding.toString(2);
      }

      // Csum characters (C and K)
      const C = csum(text, 20);
      s += LOOKUP_TABLE[C].encoding.toString(2);

      const K = csum(text.concat(C), 15);
      s += LOOKUP_TABLE[K].encoding.toString(2);

      // End
      s += LOOKUP_TABLE[null].encoding.toString(2);
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
