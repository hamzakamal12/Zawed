-- =====================================================================
-- Zawed Supply — catalog seed (no auth dependency)
-- Runs automatically on `supabase db reset`. Users + sample orders live
-- in seed_demo_users.sql (needs the auth schema).
-- =====================================================================

begin;

-- Live FX rate (parallel market, SDG per USD)
insert into fx_rates (rate_sdg_per_usd, source) values (2600.0000, 'parallel_market');

-- Categories
insert into categories (name_ar, name_en, sort_order, icon) values
  ('ورق وطباعة',        'Paper & Printing',   1, 'file-text'),
  ('أدوات كتابة',       'Writing Instruments', 2, 'pen'),
  ('ملفات وتنظيم',      'Filing & Organization',3,'folder'),
  ('أحبار وطابعات',     'Ink & Toner',         4, 'printer'),
  ('مستلزمات مكتبية',   'Desk Supplies',       5, 'paperclip'),
  ('ضيافة ومطبخ',       'Pantry & Kitchen',    6, 'coffee'),
  ('نظافة',             'Cleaning',            7, 'spray'),
  ('إلكترونيات وملحقات','IT Accessories',      8, 'cpu');

-- Staging table for the 40+ catalog items
create temporary table _seed_products (
  sku text, name_ar text, name_en text, cat_en text,
  unit product_unit, units_per_pack int, cost_usd numeric, margin numeric,
  stock int, reorder int, min_qty int
) on commit drop;

insert into _seed_products values
-- Paper & Printing
('PAP-A4-80','ورق تصوير A4 وزن 80 جرام (رزمة 500)','A4 Copy Paper 80gsm','Paper & Printing','ream',1,3.50,25,500,100,1),
('PAP-A3-80','ورق تصوير A3 وزن 80 جرام (رزمة 500)','A3 Copy Paper 80gsm','Paper & Printing','ream',1,7.00,25,120,30,1),
('PAP-A4-70','ورق تصوير A4 وزن 70 جرام (رزمة 500)','A4 Copy Paper 70gsm','Paper & Printing','ream',1,3.00,25,300,60,1),
('PAP-FLIP','ورق سبورة قلّاب','Flip Chart Paper','Paper & Printing','piece',1,6.00,30,40,10,1),
('PAP-STICKY','أوراق ملاحظات لاصقة ملوّنة','Sticky Notes (assorted)','Paper & Printing','box',1,1.20,40,200,40,1),
-- Writing Instruments
('PEN-BL-50','أقلام جافة زرقاء (علبة 50)','Ballpoint Pens Blue box/50','Writing Instruments','box',50,4.00,35,150,30,1),
('PEN-BK-50','أقلام جافة سوداء (علبة 50)','Ballpoint Pens Black box/50','Writing Instruments','box',50,4.00,35,150,30,1),
('PENCIL-HB','أقلام رصاص HB (علبة 12)','Pencils HB box/12','Writing Instruments','box',12,1.50,40,200,40,1),
('MARKER-WB','أقلام سبورة بيضاء (علبة 4)','Whiteboard Markers set/4','Writing Instruments','box',4,2.50,35,120,25,1),
('HIGHLIGHT','أقلام تحديد ملوّنة (علبة 6)','Highlighters set/6','Writing Instruments','box',6,2.00,40,90,20,1),
-- Filing & Organization
('FILE-BOX','صندوق حفظ ملفات','Box File','Filing & Organization','piece',1,1.80,40,250,50,1),
('FOLDER-SUS','ملفات معلّقة (علبة 25)','Suspension Files box/25','Filing & Organization','box',25,6.00,30,60,15,1),
('BINDER-2','ملف بحلقتين A4','2-Ring Binder A4','Filing & Organization','piece',1,1.50,40,300,60,1),
('SHEET-PROT','أكياس شفافة للحفظ (علبة 100)','Sheet Protectors box/100','Filing & Organization','box',100,3.00,35,80,20,1),
('DIVIDER','فواصل ملفات ملوّنة','File Dividers (assorted)','Filing & Organization','box',1,1.00,40,100,20,1),
-- Ink & Toner
('TONER-HP85','حبر طابعة HP 85A','HP 85A Toner Cartridge','Ink & Toner','piece',1,45.00,20,40,10,1),
('TONER-HP12','حبر طابعة HP 12A','HP 12A Toner Cartridge','Ink & Toner','piece',1,42.00,20,35,10,1),
('INK-HP-BK','خرطوشة حبر HP أسود','HP Ink Cartridge Black','Ink & Toner','piece',1,15.00,25,60,15,1),
('INK-HP-CL','خرطوشة حبر HP ملوّن','HP Ink Cartridge Color','Ink & Toner','piece',1,18.00,25,55,15,1),
('TONER-CANON','حبر طابعة Canon 337','Canon 337 Toner','Ink & Toner','piece',1,40.00,20,30,8,1),
-- Desk Supplies
('STAPLER','دبّاسة معدنية','Metal Stapler','Desk Supplies','piece',1,3.00,40,120,25,1),
('STAPLES','دبابيس (علبة 5000)','Staples box/5000','Desk Supplies','box',5000,0.80,45,300,60,1),
('PUNCH-2','خرّامة ورق بفتحتين','2-Hole Punch','Desk Supplies','piece',1,4.00,35,90,20,1),
('SCISSOR','مقص مكتبي','Office Scissors','Desk Supplies','piece',1,1.50,45,140,30,1),
('TAPE-CLR','شريط لاصق شفاف','Clear Adhesive Tape','Desk Supplies','piece',1,0.60,50,400,80,1),
('CLIP-PAPER','مشابك ورق (علبة)','Paper Clips box','Desk Supplies','box',1,0.50,50,350,70,1),
('CALC-12','آلة حاسبة 12 خانة','Calculator 12-digit','Desk Supplies','piece',1,6.00,30,70,15,1),
-- Pantry & Kitchen
('COFFEE-INST','قهوة سريعة التحضير 200 جرام','Instant Coffee 200g','Pantry & Kitchen','piece',1,5.00,30,100,20,1),
('TEA-100','شاي أكياس (علبة 100)','Tea Bags box/100','Pantry & Kitchen','box',100,3.00,35,120,25,1),
('SUGAR-1KG','سكر أبيض 1 كيلوجرام','White Sugar 1kg','Pantry & Kitchen','kg',1,1.00,30,200,40,1),
('WATER-500','مياه معدنية 500 مل (كرتون 24)','Mineral Water 500ml carton/24','Pantry & Kitchen','carton',24,3.50,25,150,30,1),
('CUPS-PAPER','أكواب ورقية (علبة 50)','Paper Cups box/50','Pantry & Kitchen','box',50,1.50,40,180,40,1),
('CREAMER','مبيّض قهوة','Coffee Creamer','Pantry & Kitchen','piece',1,3.00,30,80,20,1),
-- Cleaning
('SANITIZER-1L','معقّم لليدين 1 لتر','Hand Sanitizer 1L','Cleaning','liter',1,3.00,35,90,20,1),
('WIPES-200','مناديل مبللة معقّمة (200)','Disinfectant Wipes 200ct','Cleaning','box',200,3.50,35,70,15,1),
('TISSUE-BOX','مناديل ورقية (علبة)','Facial Tissue box','Cleaning','box',1,0.80,45,300,60,1),
('TRASH-BAG','أكياس نفايات (رول)','Trash Bags roll','Cleaning','piece',1,2.00,40,160,30,1),
('SOAP-LIQ','صابون سائل 5 لتر','Liquid Hand Soap 5L','Cleaning','liter',1,6.00,30,50,12,1),
-- IT Accessories
('USB-32','فلاش USB سعة 32 جيجا','USB Flash Drive 32GB','IT Accessories','piece',1,5.00,30,120,25,1),
('MOUSE-OPT','ماوس بصري سلكي','Optical Wired Mouse','IT Accessories','piece',1,4.00,35,100,20,1),
('KB-AR','لوحة مفاتيح عربي/إنجليزي','Keyboard AR/EN','IT Accessories','piece',1,8.00,30,80,15,1),
('HDMI-2M','كابل HDMI طول 2 متر','HDMI Cable 2m','IT Accessories','piece',1,3.00,40,110,20,1),
('POWER-STRIP','مشترك كهرباء 5 مخارج','Power Strip 5-way','IT Accessories','piece',1,6.00,35,90,20,1),
('BATTERY-AA','بطاريات AA (علبة 40)','AA Batteries box/40','IT Accessories','box',40,8.00,30,130,25,1);

-- Products
insert into products (sku, name_ar, name_en, category_id, unit, units_per_pack, min_order_qty)
select s.sku, s.name_ar, s.name_en, c.id, s.unit, s.units_per_pack, s.min_qty
from _seed_products s
join categories c on c.name_en = s.cat_en;

-- Active prices (cost + margin only)
insert into product_prices (product_id, cost_usd, margin_percent)
select p.id, s.cost_usd, s.margin
from _seed_products s join products p on p.sku = s.sku;

-- Inventory
insert into inventory (product_id, qty_on_hand, reorder_point, warehouse_location)
select p.id, s.stock, s.reorder, 'المستودع الرئيسي - الخرطوم'
from _seed_products s join products p on p.sku = s.sku;

-- Global volume discount tiers (apply to all products / all companies)
insert into price_tiers (company_id, product_id, min_qty, discount_percent) values
  (null, null, 10, 5.00),
  (null, null, 50, 10.00);

commit;
