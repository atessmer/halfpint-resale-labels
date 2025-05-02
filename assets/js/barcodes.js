const BARCODE_WIDTH = 120;
const BARCODE_HEIGHT = 35;

const addLabelInputs = (price=null, count=null) => {
   const labelInputGroups = document.getElementById('label-input-groups');
   const idx = labelInputGroups.childNodes.length;

   const template = document.createElement('template');
   template.innerHTML = `
      <div class="label-input-group">
         <div class="input-group">
            <label for="price_${idx}">Price</label>
            $<input name="price" id="price_${idx}" type="number" value="${price}">.00
         </div>
         <div class="input-group">
            <label for="count_${idx}">Count</label>
            <input name="count" id="count_${idx}" type="number" value="${count}">
         </div>
         <i class="delete-label-input bi bi-x-square-fill"></i>
      </div>
   `.trim();
   const labelInputGroup = template.content.childNodes[0];

   const deleteButton = labelInputGroup.getElementsByClassName('delete-label-input')[0]
   deleteButton.addEventListener('click', (e) => {
      e.target.parentNode.remove();
   })

   labelInputGroups.appendChild(labelInputGroup);
}

const svgNodeCache = {};
const getBarcodeSvgNode = async (data) => {
   if (!(data in svgNodeCache)) {
      const svg = Code93Barcode(data).toSVG({
         width: BARCODE_WIDTH,
         height: BARCODE_HEIGHT,
      });

      svgNodeCache[data] = svg;
   }

   return svgNodeCache[data].cloneNode(true);
};

const getBarcodeLabelNode = async (sellerID, price) => {
   const svg = await getBarcodeSvgNode(`${sellerID}$${price}`);

   const template = document.createElement('template');
   template.innerHTML = `
      <div class='barcode-label'>
         <div class='barcode-header'>halfpintresale.com</div>
         <div class='barcode-svg'></div>
         <div class='barcode-footer'>
            <div class='seller-id'>${sellerID}</div>
            <div class='price'>$${price}</div>
         </div>
      </div>
   `.trim();
   const barcodeLabel = template.content.childNodes[0]
   barcodeLabel.getElementsByClassName('barcode-svg')[0].appendChild(svg);

   return template.content.childNodes[0];
};

const generateBarcodeLabels = async () => {
   const pages = document.getElementById('pages');
   const sellerID = document.getElementById('sellerid');
   const labelPrices = document.getElementsByName('price');
   const labelCounts = document.getElementsByName('count');

   if (labelPrices.length != labelCounts.length) {
      console.error('Length of label prices and counts do not match.');
      return;
   }

   while (pages.lastChild) {
      pages.removeChild(pages.lastChild);
   }

   const barcodeLabels = []
   for (var i = 0; i < labelCounts.length; i++) {
      const count = labelCounts[i].value;
      for (var j = 0; j < count; j++) {
         barcodeLabels.push(
            await getBarcodeLabelNode(sellerID.value, labelPrices[i].value+'.00')
         );
      }
   }
   for (const barcodeLabel of barcodeLabels) {
      pages.appendChild(barcodeLabel);
   }
};

document.addEventListener("DOMContentLoaded", async () => {
   document.getElementById('add-label-input').addEventListener("click", (e) => {
      addLabelInputs();
   });
   addLabelInputs('1', '10');

   document.getElementById('generate-barcodes').addEventListener('click', generateBarcodeLabels);
});
