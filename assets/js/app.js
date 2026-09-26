import Code93Barcode from './code93.js';
import {
   createCookie,
   readCookie,
} from './cookies.js';

const BARCODE_WIDTH = 120;
const BARCODE_HEIGHT = 35;

const LABEL_TEMPLATES = new Map([
   ['Half-Pint', {
      desc: 'Resale Tags',
      count: 6,
      createdCB: (e) => halfPintTagCreated(e),
   }],
   ['5260', {
      desc: '1" x 2-5/8" Address Labels',
      count: 30,
   }],
   ['S-20133', {
      desc: '1" x 2" Labels',
      count: 40,
   }],
]);

const populateTemplateOptions = () => {
   const template = document.getElementById('template');

   for (const [id, cfg] of LABEL_TEMPLATES.entries()) {
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
      ...LABEL_TEMPLATES.get(templateId),
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
   if (!isPositiveInteger(consigner) || !isPositiveInteger(price)) {
      return null;
   }

   const barcodeLabel = createElementsByHTML(`
      <div class='barcode-label fw-bold border border-light-subtle rounded-1 float-start overflow-hidden d-flex justify-content-center align-items-center'>
      </div>
   `);

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

   const template = getTemplate();

   const barcodeLabels = []
   for (let i = 0; i < tagCounts.length; i++) {
      const count = tagCounts[i].valueAsNumber;
      const price = tagPrices[i].valueAsNumber;
      const barcodeLabelNode = getBarcodeLabelNode(consigner.valueAsNumber, price)
      if (barcodeLabelNode == null) {
         continue;
      }
      for (let j = 0; j < count; j++) {
         const newLabelNode = barcodeLabelNode.cloneNode(true);
         if (typeof template?.createdCB == 'function') {
            template.createdCB(newLabelNode);
         }
         barcodeLabels.push(newLabelNode);
      }
   }

   pages.classList.forEach((cls) => {
      if (cls.startsWith('template_')) {
         pages.classList.remove(cls)
      }
   });
   pages.classList.add(`template_${getTemplate().id}`);

   const templateCount = template.count;
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

/*
 * Half-Pint Resale Tags
 */
const halfPintTagCreated = (newLabelNode) => {
   newLabelNode.classList.add('flex-col');
   newLabelNode.classList.remove('d-flex', 'border', 'border-light-subtle', 'rounded-1');

   newLabelNode.querySelector('.barcode-content').classList.add('flex-row');

   newLabelNode.prepend(createElementsByHTML(`
      <div class='size flex-row text-end'>Size</div>
   `));

   newLabelNode.prepend(createElementsByHTML(`
      <div class='item flex-row text-end'>Item</div>
   `));

   newLabelNode.prepend(createElementsByHTML(`
      <div class='dbg-row flex-row d-flex'>
         <div class='donate flex-col flex-fill'>D</div>
         <div class='boy-girl flex-col flex-fill'>B / G</div>
      </div>
   `));

   newLabelNode.prepend(createElementsByHTML(`
      <div class='logo flex-row'>
         <img class="max-h-full max-w-full object-contain" src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQ3IiBoZWlnaHQ9Ijc0IiB2ZXJzaW9uPSIxLjEiIHZpZXdCb3g9IjAgMCAyNDcgNzQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiPgogPHRleHQgeD0iOTAuNjg3NSIgeT0iNTUuMTcxODc1IiBmaWxsPSIjZmYwMGZmIiBmb250LXNpemU9IjE2cHgiIGxldHRlci1zcGFjaW5nPSIyLjc1cHgiIHhtbDpzcGFjZT0icHJlc2VydmUiPjx0c3BhbiB4PSI5MC42ODc1IiB5PSI1NS4xNzE4NzUiIGZpbGw9IiMwMDAwMDAiIGZvbnQtZmFtaWx5PSJBcmltbyIgZm9udC1zaXplPSIxNnB4Ij5SRVNBTEU8L3RzcGFuPjwvdGV4dD4gPHRleHQgeD0iOTAuMjE4NzUiIHk9IjM3LjE3OTY4OCIgZmlsbD0iIzAwMDAwMCIgZm9udC1mYW1pbHk9IkFyaW1vIiBmb250LXNpemU9IjI0cHgiIGxldHRlci1zcGFjaW5nPSIxLjg1cHgiIHhtbDpzcGFjZT0icHJlc2VydmUiPjx0c3BhbiB4PSI5MC4yMTg3NSIgeT0iMzcuMTc5Njg4IiBmb250LWZhbWlseT0iJ0FyaWFsIEJsYWNrJyIgZm9udC1zaXplPSIyNHB4IiBmb250LXdlaWdodD0iYm9sZCI+SEFMRi1QSU5UPC90c3Bhbj48L3RleHQ+IDxjaXJjbGUgY3g9IjM3IiBjeT0iMzciIHI9IjM1LjQzOCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjMiLz4gPHBhdGggZD0ibTM3IDZhMzEgMzEgMCAwIDAtMzEgMzEgMzEgMzEgMCAwIDAgMzEgMzEgMzEgMzEgMCAwIDAgMi44MjAzLTAuMTg1NTUgNSA1IDAgMCAxLTAuMTk3MjYtMS4yNTIgNSA1IDAgMCAxIDIuOTc4NS00LjUxMzdsLTIuMDQ4OC0xMy40NDMtMTEuNiAwLjcyMDdhNC41IDQuNSAwIDAgMSAwLjAwMzkwNiAwLjA3MjI2NiA0LjUgNC41IDAgMCAxLTQuNSA0LjUgNC41IDQuNSAwIDAgMS00LjUtNC41IDQuNSA0LjUgMCAwIDEgNC41LTQuNSA0LjUgNC41IDAgMCAxIDMuNTM3MSAxLjcyMDdsOC4zNzExLTMuMTIxMS05LjE5NTMtNi45Mjk3IDEuNjU2Mi0yLjY1MjMgOS45MTggNS4wOTE4IDEuNjA1NS0xMi44NjlhNC41IDQuNSAwIDAgMS00LjEwNTUtNC40MjE5IDQuNSA0LjUgMCAwIDEgNC41LTQuNSA0LjUgNC41IDAgMCAxIDQuNSA0LjUgNC41IDQuNSAwIDAgMS0zLjA0NDkgNC4yMDlsMy4wMTk1IDExLjc5MyAxNS4yNjQtMi4wMDM5YTUuNSA1LjUgMCAwIDEtMC4xMTMyOC0wLjcxMDk0IDUuNSA1LjUgMCAwIDEgNS41LTUuNSA1LjUgNS41IDAgMCAxIDEuMjQwMiAwLjE0MDYyIDMxIDMxIDAgMCAwLTMwLjEwOS0yMy42NDV6bTI2LjA4NCAzMy42ODItMTUuODU5IDQuMTA3NCA4LjI5ODggNC43OTg4LTAuNjEzMjggMS42MzA5LTguMzI0Mi0yLjYyNyAwLjE4OTQ1IDE0LjQ2N2E1IDUgMCAwIDEgMi42OTM0IDMuMjgzMiAzMSAzMSAwIDAgMCAxOC4zMjYtMjUuMjIzIDUuNSA1LjUgMCAwIDEtMS45MjU4IDAuMzg0NzYgNS41IDUuNSAwIDAgMS0yLjc4NTItMC44MjIyNnoiIHN0cm9rZS13aWR0aD0iMS4wNTk1Ii8+PC9zdmc+">
      </div>
   `));
};
