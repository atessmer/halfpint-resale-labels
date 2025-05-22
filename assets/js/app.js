const BARCODE_WIDTH = 120;
const BARCODE_HEIGHT = 35;

const LABEL_TEMPLATES = {
   5260: {
      desc: '1" x 2-5/8" Address Labels',
      count: 30,
   },
   'S-20133': {
      desc: '1" x 2" Labels',
      count: 40,
   },
};

/*
 * Cookie handlers.
 * source: https://www.quirksmode.org/js/cookies.html
 */
const createCookie = (name, value) => {
   document.cookie = `${name}=${value}; path=/`;
}

const readCookie = (name) => {
   const cookies = document.cookie.split(";");
   for (const cookie of cookies) {
      const [cookie_name, cookie_value] = cookie.trim().split("=");
      if (cookie_name == name) {
         return cookie_value;
      }
   }
   return null;
}

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
      id: templateId,
      ...LABEL_TEMPLATES[templateId],
   }
};

const addTagGroup = (price=null, count=null) => {
   const tagsContainer = document.getElementById('tags-container');

   const template = document.createElement('template');
   template.innerHTML = `
      <div class="tag-group mb-2 input-group ">
         <input type="number" name="count" value="${count}" class="form-control text-end pe-1">
         <span class="input-group-text pe-4">Tags</span>
         <span class="input-group-text ps-4 pe-1">$</span>
         <input type="number" name="price" value="${price}" class="form-control text-end pe-1">
         <span class="input-group-text ps-1">.00</span>
         <button type="button" class="delete-tag btn btn-danger">
            <i class="delete-label-input bi bi-trash3-fill"></i>
         </button>
      </div>
   `.trim();
   const tagGroup = template.content.childNodes[0];

   const deleteButton = tagGroup.getElementsByClassName('delete-tag')[0];
   deleteButton.addEventListener('click', (e) => {
      e.target.closest('.tag-group').remove();
      generateBarcodeLabels();
   })

   tagsContainer.appendChild(tagGroup);
   validateAllInputs();
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
      <div class='barcode-label fw-bold border border-light-subtle rounded-1 float-start overflow-hidden d-flex justify-content-center align-items-center'>
         <div class='barcode-content'>
            <div class='barcode-header'>halfpintresale.com</div>
            <div class='barcode-svg'></div>
            <div class='barcode-footer'>
               <div class='consigner d-inline-block mx-2'>${consigner}</div>
               <div class='price d-inline-block mx-2'>$${price}</div>
            </div>
	 </div>
      </div>
   `.trim();
   const barcodeLabel = template.content.childNodes[0];
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
         page.classList.add('page', 'text-center', 'border', 'border-black');
         pages.appendChild(page);
      }
      page.appendChild(barcodeLabel);
   }

   updateTagsMsg();
};

const validateInput = (input) => {
   if (input.value == '' ||
       (input.type == 'number' && parseInt(input.value) <= 0)) {
      input.classList.add('is-invalid');
   } else {
      input.classList.remove('is-invalid');
   }
};

const validateAllInputs = () => {
   for (const input of document.forms.controls.elements) {
      if (['INPUT'].includes(input.tagName)) {
         validateInput(input);
      }
   }
};

document.addEventListener("DOMContentLoaded", () => {
   const consigner = document.getElementById('consigner');
   consigner.value = readCookie('consigner');
   consigner.addEventListener('input', (e) => {
      createCookie('consigner', e.target.value);
   });

   document.getElementById('template').addEventListener('input', () => {
      const pages = document.getElementById('pages');

      pages.classList.forEach((cls) => {
         if (cls.startsWith('template_')) {
            pages.classList.remove(cls)
         }
      });
      pages.classList.add(`template_${getTemplate().id}`);
   });
   populateTemplateOptions();

   document.getElementById('add-tag').addEventListener("click", () => {
      addTagGroup();
   });
   addTagGroup('2', '10');

   // Re-generate labels on any form field input event
   document.forms.controls.addEventListener('input', (e) => {
      validateInput(e.target);
      generateBarcodeLabels();
   });

   validateAllInputs();
   generateBarcodeLabels();
});
