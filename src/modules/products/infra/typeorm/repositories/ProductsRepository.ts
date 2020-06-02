import { getRepository, Repository, In } from 'typeorm';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICreateProductDTO from '@modules/products/dtos/ICreateProductDTO';
import IUpdateProductsQuantityDTO from '@modules/products/dtos/IUpdateProductsQuantityDTO';
import AppError from '@shared/errors/AppError';
import Product from '../entities/Product';

interface IFindProducts {
  id: string;
}

class ProductsRepository implements IProductsRepository {
  private ormRepository: Repository<Product>;

  constructor() {
    this.ormRepository = getRepository(Product);
  }

  public async create({
    name,
    price,
    quantity,
  }: ICreateProductDTO): Promise<Product> {
    if (quantity < 0) {
      throw new AppError('Invalid quantity');
    }

    const productAlreadyExist = await this.ormRepository.findOne({
      where: {
        name,
      },
    });

    if (productAlreadyExist) {
      throw new AppError('Product already exists');
    }

    const product = await this.ormRepository.save({
      name,
      price,
      quantity,
    });

    return product;
  }

  public async findByName(name: string): Promise<Product | undefined> {
    const product = await this.ormRepository.findOne({
      name,
    });

    return product;
  }

  public async findAllById(products: IFindProducts[]): Promise<Product[]> {
    const productIds = products.map(product => product.id);

    const responseProducts = await this.ormRepository.find({
      where: {
        id: In(productIds),
      },
    });

    return responseProducts;
  }

  public async updateQuantity(
    products: IUpdateProductsQuantityDTO[],
  ): Promise<Product[]> {
    const productIds = products.map(product => product.id);

    const findProducts = await this.ormRepository.find({
      where: {
        id: In(productIds),
      },
    });

    const updatedProducts = findProducts.map(product => {
      const newQuantity =
        products.find(item => item.id === product.id)?.quantity || 0;

      return {
        ...product,
        quantity: newQuantity,
      };
    });

    await this.ormRepository.save(updatedProducts);

    return updatedProducts;
  }
}

export default ProductsRepository;
