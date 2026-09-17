import React from 'react';

const ProductCard = ({ product, onAsk }) => {
  const sizes = product.sizes || {};
  const sizeLabel = Object.entries(sizes)
    .map(([size, qty]) => `${size}${qty > 0 ? '' : ' (سالى)'}`)
    .join(' · ');

  return (
    <article className="min-w-[168px] max-w-[168px] bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm">
      {product.image ? (
        <img src={product.image} alt={product.name} className="h-28 w-full object-cover" />
      ) : (
        <div className="h-28 bg-slate-100" />
      )}
      <div className="p-2.5">
        <p className="text-[11px] text-teal-700 mb-0.5">{product.category}</p>
        <h3 className="text-sm font-semibold text-slate-900 leading-snug line-clamp-2">
          {product.name_darija || product.name}
        </h3>
        <p className="text-sm font-bold text-slate-900 mt-1">{product.price_mad} دج</p>
        {sizeLabel ? <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{sizeLabel}</p> : null}
        {!sizeLabel && product.stock_total != null ? (
          <p className="text-[10px] text-slate-500 mt-1">المخزون: {product.stock_total}</p>
        ) : null}
        <button
          type="button"
          onClick={() => onAsk && onAsk(`سقسيني على ${product.name_darija || product.name}، المعرّف ${product.id}`)}
          className="mt-2 w-full text-xs bg-slate-800 text-white rounded-lg py-1.5"
        >
          سقسيني عليها
        </button>
      </div>
    </article>
  );
};

export default ProductCard;
