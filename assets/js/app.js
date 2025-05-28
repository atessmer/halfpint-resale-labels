import Code93Barcode from './code93.js';
import {
   createCookie,
   readCookie,
} from './cookies.js';

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

const createElementsByHTML = (html) => {
   const template = document.createElement('template');
   template.innerHTML = html.trim();

   return template.content.childNodes[0];
};

const addTagGroup = (price=null, count=null) => {
   const tagsContainer = document.getElementById('tags-container');

   const tagGroup = createElementsByHTML(`
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
   `);

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
   const totalTags = Array.from(tagCounts)
      .map(t => isPositiveInteger(t.valueAsNumber) ? t.valueAsNumber : 0)
      .reduce((sum, v) => {
         return sum + v
      }, 0);

   const template = getTemplate();
   const pages = Math.ceil(totalTags / template.count);
   const lastPageTags = totalTags % template.count;
   const emptyLabels = lastPageTags ? (template.count - lastPageTags) : 0;

   const tagsMsg = document.getElementById('tags-msg');
   if (emptyLabels) {
      tagsMsg.classList.remove('text-success');
      tagsMsg.classList.add('text-danger');
      tagsMsg.innerText = `${pages} Page${pages > 1 ? 's' : ''} - ${emptyLabels} unused labels on last page.`;
   } else {
      tagsMsg.classList.remove('text-danger');
      tagsMsg.classList.add('text-success');
      tagsMsg.innerText = `${pages} Page${pages > 1 ? 's' : ''} - no unused labels on last page.`;
   }
};

const svgNodeCache = {};
const getBarcodeSvgNode = (data) => {
   if (!(data in svgNodeCache)) {
      const svg = new Code93Barcode(data).toSVG({
         width: BARCODE_WIDTH,
         height: BARCODE_HEIGHT,
      });

      svgNodeCache[data] = svg;
   }

   return svgNodeCache[data].cloneNode(true);
};

const getBarcodeLabelNode = (consigner, price) => {
   const barcodeLabel = createElementsByHTML(`
      <div class='barcode-label fw-bold border border-light-subtle rounded-1 float-start overflow-hidden d-flex justify-content-center align-items-center'>
      </div>
   `);

   if (isPositiveInteger(consigner) && isPositiveInteger(price)) {
      price = `$${price}.00`;

      const barcodeContent = createElementsByHTML(`
         <div class='barcode-content'>
            <div class='barcode-header'>halfpintresale.com</div>
            <div class='barcode-svg'></div>
            <div class='barcode-footer'>
               <div class='consigner d-inline-block mx-2'>${consigner}</div>
               <div class='price d-inline-block mx-2'>${price}</div>
            </div>
         </div>
      `);

      const svg = getBarcodeSvgNode(`${consigner}${price}`);
      barcodeContent.getElementsByClassName('barcode-svg')[0].appendChild(svg);
      barcodeLabel.appendChild(barcodeContent);
   }

   return barcodeLabel;
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
   for (let i = 0; i < tagCounts.length; i++) {
      const count = tagCounts[i].valueAsNumber;
      const price = tagPrices[i].valueAsNumber;
      const barcodeLabelNode = getBarcodeLabelNode(consigner.valueAsNumber, price)
      for (let j = 0; j < count; j++) {
         barcodeLabels.push(barcodeLabelNode.cloneNode(true));
      }
   }

   const template = getTemplate();
   pages.classList.forEach((cls) => {
      if (cls.startsWith('template_')) {
         pages.classList.remove(cls)
      }
   });
   pages.classList.add(`template_${getTemplate().id}`);

   const templateCount = getTemplate().count;
   let page;
   for (const [i, barcodeLabel] of barcodeLabels.entries()) {
      if (i % templateCount == 0) {
         page = document.createElement('div');
         page.classList.add('page', 'text-center', 'border', 'border-black');
         pages.appendChild(page);
      }
      page.appendChild(barcodeLabel);
   }

   updateTagsMsg();
   updateUrlHash();
};

const isPositiveInteger = (x) => {
   return Number.isInteger(x) && x > 0;
};

const validateInput = (input) => {
   if (input.value == '' ||
       (input.type == 'number' && !isPositiveInteger(input.valueAsNumber))) {
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

const updateUrlHash = () => {
   const consigner = document.getElementById('consigner');
   const template = document.getElementById('template');
   const tagPrices = document.getElementsByName('price');
   const tagCounts = document.getElementsByName('count');

   if (tagPrices.length != tagCounts.length) {
      console.error('Number of count and price inputs does not match.');
      return;
   }

   const data = {
      consigner: consigner.valueAsNumber,
      template: template.value,
      tags: Array.from(tagPrices).map((_, idx) => {
         return {
            count: tagCounts[idx].valueAsNumber,
            price: tagPrices[idx].valueAsNumber,
         }
      }),
   }

   window.location.hash = btoa(JSON.stringify(data));
};

const parseUrlHash = () => {
   let data;
   try {
      data = JSON.parse(atob(window.location.hash.substr(1)));
   } catch (e) {
      return false;
   };

   document.getElementById('consigner').value = data.consigner;
   document.getElementById('template').value = data.template;
   for (const tag of data.tags) {
      addTagGroup(tag.price, tag.count);
   }
   return true;
};

document.addEventListener("DOMContentLoaded", () => {
   const consigner = document.getElementById('consigner');
   consigner.value = readCookie('consigner');
   consigner.addEventListener('input', (e) => {
      createCookie('consigner', e.target.value);
   });

   populateTemplateOptions();

   document.getElementById('add-tag').addEventListener("click", () => {
      addTagGroup();
   });

   // Re-generate labels on any form field input event
   document.forms.controls.addEventListener('input', (e) => {
      validateInput(e.target);
      generateBarcodeLabels();
   });
   document.forms.controls.addEventListener('beforeinput', (e) => {
      if (e.target.type == 'number' && e.data != null && !/^[0-9]+$/.test(e.data)) {
         e.preventDefault();
      }
   });

   // Load config from URL, or populate defaults
   if (!parseUrlHash()) {
      addTagGroup('2', '10');
   }

   validateAllInputs();
   generateBarcodeLabels();
});
