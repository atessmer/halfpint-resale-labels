const BARCODE_WIDTH = 120;
const BARCODE_HEIGHT = 35;

const LABEL_TEMPLATES = {
   5260: {
      desc: '1" x 2-5/8" Address Labels',
      count: 30,
   },
   5195: {
      desc: '2/3" x 1-3/4" Return Address Labels',
      count: 60,
   },
   'S-20133': {
      desc: '1" x 2" Labels',
      count: 40,
   },
};

const populateTemplateOptions = () => {
   const template = document.getElementById('template');

   for (const [id, cfg] of Object.entries(LABEL_TEMPLATES)) {
      const option = document.createElement('option');
      option.value = id;
      option.innerText = `${id}: ${cfg.desc}`;
      template.appendChild(option);
   }

   template.dispatchEvent(new Event('input'));
};

const getTemplate = () => {
   const templateId = document.getElementById('template').value;

   return {
      id: document.getElementById('template').value,
      ...LABEL_TEMPLATES[templateId],
   }
};

const addTagGroup = (price=null, count=null) => {
   const tagsContainer = document.getElementById('tags-container');
   const idx = tagsContainer.childNodes.length;

   const template = document.createElement('template');
   template.innerHTML = `
      <div class="tag-group mb-2 row">
         <div class="col-4"></div>
         <div class="col-1">
            <input type="number" name="count" value="${count}" class="form-control">
         </div>
         <div class="col-1 col-form-label">
            @
         </div>
         <div class="col-2">
            <div class="input-group">
               <span class="input-group-text">$</span>
               <input type="number" name="price" value="${price}" class="form-control">
               <span class="input-group-text">.00</span>
            </div>
         </div>
         <div class="col-1">
            <button type="button" class="delete-tag btn btn-danger">
               <i class="delete-label-input bi bi-trash3-fill"></i>
            </button>
         </div>
      </div>
   `.trim();
   const tagGroup = template.content.childNodes[0];

   const deleteButton = tagGroup.getElementsByClassName('delete-tag')[0];
   deleteButton.addEventListener('click', (e) => {
      e.target.closest('.tag-group').remove();
      generateBarcodeLabels();
   })

   tagsContainer.appendChild(tagGroup);
}

const updateTagsMsg = () => {
   const tagCounts = document.getElementsByName('count');
   const totalTags = tagCounts.values().reduce((sum, tagCount) => {
      return sum + parseInt(tagCount.value || 0)
   }, 0);

   const template = getTemplate();
   const lastPageTags = totalTags % template.count;
   const emptyLabels = lastPageTags ? (template.count - lastPageTags) : 0;

   const tagsMsg = document.getElementById('tags-msg');
   if (emptyLabels) {
      tagsMsg.classList.remove('text-success');
      tagsMsg.classList.add('text-danger');
      tagsMsg.innerText = `${emptyLabels} unused labels on last page.`;
   } else {
      tagsMsg.classList.remove('text-danger');
      tagsMsg.classList.add('text-success');
      tagsMsg.innerText = 'No unused labels on last page.';
   }
};

const svgNodeCache = {};
const getBarcodeSvgNode = (data) => {
   if (!(data in svgNodeCache)) {
      const svg = Code93Barcode(data).toSVG({
         width: BARCODE_WIDTH,
         height: BARCODE_HEIGHT,
      });

      svgNodeCache[data] = svg;
   }

   return svgNodeCache[data].cloneNode(true);
};

const getBarcodeLabelNode = (consigner, price) => {
   const svg = getBarcodeSvgNode(`${consigner}$${price}`);

   const template = document.createElement('template');
   template.innerHTML = `
      <div class='barcode-label'>
         <div class='barcode-content'>
            <div class='barcode-header'>halfpintresale.com</div>
            <div class='barcode-svg'></div>
            <div class='barcode-footer'>
               <div class='consigner'>${consigner}</div>
               <div class='price'>$${price}</div>
            </div>
	 </div>
      </div>
   `.trim();
   const barcodeLabel = template.content.childNodes[0]
   barcodeLabel.getElementsByClassName('barcode-svg')[0].appendChild(svg);

   return template.content.childNodes[0];
};

const generateBarcodeLabels = () => {
   const pages = document.getElementById('pages');
   const consigner = document.getElementById('consigner');
   const tagPrices = document.getElementsByName('price');
   const tagCounts = document.getElementsByName('count');

   if (tagPrices.length != tagCounts.length) {
      console.error('Number of count and price inputs does not match.');
      return;
   }

   while (pages.lastChild) {
      pages.removeChild(pages.lastChild);
   }

   const barcodeLabels = []
   for (var i = 0; i < tagCounts.length; i++) {
      const count = tagCounts[i].value;
      for (var j = 0; j < count; j++) {
         barcodeLabels.push(
            getBarcodeLabelNode(consigner.value, tagPrices[i].value+'.00')
         );
      }
   }

   let page;
   for (const [i, barcodeLabel] of barcodeLabels.entries()) {
      if (i % getTemplate().count == 0) {
         page = document.createElement('div');
	 page.classList.add('page');
	 pages.appendChild(page);
      }
      page.appendChild(barcodeLabel);
   }

   updateTagsMsg();
};

document.addEventListener("DOMContentLoaded", () => {
   document.getElementById('template').addEventListener('input', (e) => {
      const pages = document.getElementById('pages');

      pages.classList.forEach((cls) => {
         if (cls.startsWith('template_')) {
            pages.classList.remove(cls)
         }
      });
      pages.classList.add(`template_${getTemplate().id}`);
   });
   populateTemplateOptions();

   document.getElementById('add-tag').addEventListener("click", (e) => {
      addTagGroup();
   });
   addTagGroup('2', '10');

   // Re-generate labels on any form field input event
   document.forms.controls.addEventListener('input', (e) => {
      generateBarcodeLabels();
   });

   generateBarcodeLabels();
});
