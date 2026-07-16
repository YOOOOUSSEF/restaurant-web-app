/**
 * BillPrint – opens a browser print dialog with a styled thermal-receipt layout.
 *
 * Usage:
 *   printBill({ order, profile, lang })
 */

export interface BillItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface BillData {
  orderNumber: string;
  orderType?: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  paymentMethod?: string;
  items: BillItem[];
  subtotal: number;
  tax: number;
  taxRate?: number;
  deliveryFee?: number;
  discount?: number;
  total: number;
  createdAt?: string;
  restaurantName?: string;
  restaurantNameAr?: string;
  restaurantCity?: string;
  restaurantPhone?: string;
  restaurantEmail?: string;
  lang?: "en" | "ar";
}

function formatCurrency(value: number) {
  return value.toFixed(2);
}

function formatDate(iso?: string) {
  if (!iso) return new Date().toLocaleString();
  return new Date(iso).toLocaleString();
}

export function printBill(data: BillData) {
  const isAr = data.lang === "ar";
  const dir = isAr ? "rtl" : "ltr";

  const restaurantName =
    (isAr ? data.restaurantNameAr : data.restaurantName) || "Urban Bites";

  const lines = data.items
    .map(
      (item) => `
      <tr>
        <td class="item-name">${item.name}</td>
        <td class="item-qty">x${item.quantity}</td>
        <td class="item-price">${formatCurrency(item.totalPrice)}</td>
      </tr>`
    )
    .join("");

  const deliveryRow =
    data.deliveryFee && data.deliveryFee > 0
      ? `<tr class="summary-row">
           <td colspan="2">${isAr ? "رسوم التوصيل" : "Delivery Fee"}</td>
           <td>${formatCurrency(data.deliveryFee)}</td>
         </tr>`
      : "";

  const discountRow =
    data.discount && data.discount > 0
      ? `<tr class="summary-row">
           <td colspan="2">${isAr ? "الخصم" : "Discount"}</td>
           <td>-${formatCurrency(data.discount)}</td>
         </tr>`
      : "";

  const taxLabel = data.taxRate
    ? `${isAr ? "ضريبة القيمة المضافة" : "VAT"} (${data.taxRate}%)`
    : isAr
    ? "الضريبة"
    : "Tax";
  const currencyLabel = isAr ? "ريال سعودي" : "SAR";

  const orderTypeLabel = data.orderType
    ? data.orderType.replace("_", " ")
    : "";

  const paymentLabel = data.paymentMethod
    ? data.paymentMethod.replace("_", " ")
    : "";

  const html = `<!DOCTYPE html>
<html dir="${dir}" lang="${isAr ? "ar" : "en"}">
<head>
  <meta charset="UTF-8" />
  <title>${isAr ? "إيصال الطلب" : "Order Receipt"} — ${data.orderNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=Tajawal:wght@400;700&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: ${isAr ? "'Tajawal', sans-serif" : "'IBM Plex Mono', monospace"};
      font-size: 13px;
      color: #111;
      background: #fff;
      display: flex;
      justify-content: center;
      padding: 20px;
    }

    .receipt {
      width: 320px;
      padding: 24px 20px;
    }

    /* ── Header ── */
    .header {
      text-align: center;
      margin-bottom: 16px;
    }
    .logo-circle {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, #C75C2E, #E8845A);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 10px;
      font-size: 22px;
    }
    .restaurant-name {
      font-size: 17px;
      font-weight: 700;
      letter-spacing: 0.5px;
      margin-bottom: 3px;
    }
    .restaurant-meta {
      font-size: 11px;
      color: #666;
      line-height: 1.5;
    }

    /* ── Divider ── */
    .dashed {
      border: none;
      border-top: 1.5px dashed #999;
      margin: 12px 0;
    }

    /* ── Order Info ── */
    .order-info {
      margin-bottom: 4px;
    }
    .order-row {
      display: flex;
      justify-content: space-between;
      font-size: 11.5px;
      margin-bottom: 4px;
    }
    .order-row .label { color: #666; }
    .order-row .value { font-weight: 600; }
    .order-number {
      text-align: center;
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 1px;
      color: #C75C2E;
      margin-bottom: 4px;
    }

    /* ── Items Table ── */
    table {
      width: 100%;
      border-collapse: collapse;
    }
    thead tr th {
      font-size: 10.5px;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding-bottom: 5px;
      border-bottom: 1px solid #ddd;
    }
    th.item-name, td.item-name { text-align: ${isAr ? "right" : "left"}; }
    th.item-qty, td.item-qty {
      text-align: center;
      width: 32px;
    }
    th.item-price, td.item-price {
      text-align: ${isAr ? "left" : "right"};
      width: 62px;
    }
    tbody td {
      font-size: 12.5px;
      padding: 5px 0;
      vertical-align: top;
    }
    td.item-name { word-break: break-word; }

    /* ── Summary ── */
    .summary {
      margin-top: 2px;
    }
    .summary-row td {
      font-size: 12px;
      padding: 3px 0;
      color: #444;
    }
    .summary-row td:first-child { text-align: ${isAr ? "right" : "left"}; }
    .summary-row td:last-child { text-align: ${isAr ? "left" : "right"}; }
    .total-row td {
      font-size: 15px;
      font-weight: 700;
      padding-top: 6px;
    }
    .total-row td:first-child { color: #111; text-align: ${isAr ? "right" : "left"}; }
    .total-row td:last-child { color: #C75C2E; text-align: ${isAr ? "left" : "right"}; }

    /* ── Footer ── */
    .footer {
      text-align: center;
      margin-top: 16px;
      font-size: 11px;
      color: #888;
      line-height: 1.6;
    }
    .footer .thank-you {
      font-size: 13px;
      font-weight: 700;
      color: #333;
      margin-bottom: 4px;
    }

    @media print {
      body { padding: 0; }
      .receipt { width: 100%; }
    }
  </style>
</head>
<body>
  <div class="receipt">

    <!-- Header -->
    <div class="header">
      <div class="logo-circle">🍽️</div>
      <div class="restaurant-name">${restaurantName}</div>
      <div class="restaurant-meta">
        ${data.restaurantCity ? data.restaurantCity + "<br/>" : ""}
        ${data.restaurantPhone ? data.restaurantPhone + "<br/>" : ""}
        ${data.restaurantEmail ? data.restaurantEmail : ""}
      </div>
    </div>

    <hr class="dashed" />

    <!-- Order Info -->
    <div class="order-info">
      <div class="order-number">${data.orderNumber}</div>
      <div class="order-row">
        <span class="label">${isAr ? "التاريخ" : "Date"}</span>
        <span class="value">${formatDate(data.createdAt)}</span>
      </div>
      <div class="order-row">
        <span class="label">${isAr ? "العميل" : "Customer"}</span>
        <span class="value">${data.customerName}</span>
      </div>
      ${
        data.customerPhone
          ? `<div class="order-row">
               <span class="label">${isAr ? "الجوال" : "Phone"}</span>
               <span class="value">${data.customerPhone}</span>
             </div>`
          : ""
      }
      ${
        data.customerAddress
          ? `<div class="order-row">
               <span class="label">${isAr ? "العنوان" : "Address"}</span>
               <span class="value">${data.customerAddress}</span>
             </div>`
          : ""
      }
      ${
        orderTypeLabel
          ? `<div class="order-row">
               <span class="label">${isAr ? "نوع الطلب" : "Type"}</span>
               <span class="value" style="text-transform:capitalize">${orderTypeLabel}</span>
             </div>`
          : ""
      }
      ${
        paymentLabel
          ? `<div class="order-row">
               <span class="label">${isAr ? "الدفع" : "Payment"}</span>
               <span class="value" style="text-transform:capitalize">${paymentLabel}</span>
             </div>`
          : ""
      }
    </div>

    <hr class="dashed" />

    <!-- Items -->
    <table>
      <thead>
        <tr>
          <th class="item-name">${isAr ? "الصنف" : "Item"}</th>
          <th class="item-qty">${isAr ? "كمية" : "Qty"}</th>
          <th class="item-price">${isAr ? "المبلغ" : "Amount"}</th>
        </tr>
      </thead>
      <tbody>
        ${lines}
      </tbody>
    </table>

    <hr class="dashed" />

    <!-- Summary -->
    <table class="summary">
      <tbody>
        <tr class="summary-row">
          <td colspan="2">${isAr ? "المجموع الفرعي" : "Subtotal"}</td>
          <td>${formatCurrency(data.subtotal)} ${currencyLabel}</td>
        </tr>
        <tr class="summary-row">
          <td colspan="2">${taxLabel}</td>
          <td>${formatCurrency(data.tax)} ${currencyLabel}</td>
        </tr>
        ${deliveryRow}
        ${discountRow}
        <tr>
          <td colspan="3"><hr class="dashed" style="margin:6px 0" /></td>
        </tr>
        <tr class="total-row">
          <td colspan="2">${isAr ? "الإجمالي" : "TOTAL"}</td>
          <td>${formatCurrency(data.total)} ${currencyLabel}</td>
        </tr>
      </tbody>
    </table>

    <hr class="dashed" />

    <!-- Footer -->
    <div class="footer">
      <div class="thank-you">${isAr ? "شكراً لزيارتكم! 🙏" : "Thank you for your visit! 🙏"}</div>
      <div>${isAr ? "نتطلع لخدمتكم مجدداً" : "We look forward to serving you again"}</div>
    </div>

  </div>

  <script>
    window.onload = function () {
      window.print();
    };
  </script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=420,height=700,scrollbars=yes");
  if (!win) {
    alert(
      data.lang === "ar"
        ? "يرجى السماح بالنوافذ المنبثقة لطباعة الفاتورة"
        : "Please allow pop-ups to print the bill"
    );
    return;
  }
  win.document.write(html);
  win.document.close();
}
