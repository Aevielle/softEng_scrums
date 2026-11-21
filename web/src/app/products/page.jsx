import { requirePageAccess } from '@/lib/auth/guard';
import { rightsFor } from '@/lib/auth/rights';
import { navGroups } from '@/lib/auth/nav';
import { listProducts } from '@/lib/products/service';
import { PRICE_RIGHTS, PRODUCT_RIGHTS } from '@/lib/products/rights';
import dash from '../dashboard/dashboard.module.css';
import Sidebar from '../dashboard/Sidebar';
import TopBar from '../dashboard/TopBar';
import DashFooter from '../dashboard/DashFooter';
import ProductsClient from './ProductsClient';

export default async function ProductsPage() {
  // Server-side check: typing /products without the "products" right redirects to /dashboard.
  // /api/products runs the same check again.
  const user = await requirePageAccess('products');

  // The service decides what each role receives: Admins get all rows plus Status/Stamp,
  // a User gets Active rows with four columns only. Every row already carries its current price.
  const rows = await listProducts(user);
  const isAdmin = user.role !== 'user';

  // Which buttons to show. rightsFor reads user_permission (Admins hold every right, a User with no rows holds none).
  // This only decides what is DRAWN: the API routes check the same rights again before saving anything.
  const rights = await rightsFor(user);
  const perm = {
    add: rights.has(PRODUCT_RIGHTS.add),
    edit: rights.has(PRODUCT_RIGHTS.edit),
    del: rights.has(PRODUCT_RIGHTS.del),
    addPrice: rights.has(PRICE_RIGHTS.add),
    editPrice: rights.has(PRICE_RIGHTS.edit),
    delPrice: rights.has(PRICE_RIGHTS.del),
  };

  return (
    <div className={dash.shell}>
      <div className={dash.orbs} aria-hidden="true">
        <i className={dash.stars} />
        <b className={dash.o1} />
        <b className={dash.o2} />
        <b className={dash.o3} />
      </div>

      <Sidebar groups={navGroups(user)} active="products" />

      <main className={dash.main}>
        <TopBar
          title="Product Management"
          role={user.role}
          roleLabel={user.roleLabel}
          firstName={user.firstName}
          email={user.email}
        />
        <ProductsClient initial={rows} isAdmin={isAdmin} perm={perm} />
        <DashFooter />
      </main>
    </div>
  );
}
