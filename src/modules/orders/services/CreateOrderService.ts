import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import { AdvancedConsoleLogger } from 'typeorm';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer does not exists');
    }

    const productsIds = products.map(product => {
      return {
        id: product.id,
      };
    });

    const storeProducts = await this.productsRepository.findAllById(
      productsIds,
    );

    if (products.length > storeProducts.length) {
      throw new AppError('Invalid product Id');
    }

    const updatedProductAndQuantity: IProduct[] = [];

    const updatedProducts = storeProducts.map(product => {
      const findProductAndQuantity = products.find(
        item => item.id === product.id,
      );

      const newQuantity =
        product.quantity - Number(findProductAndQuantity?.quantity);

      if (newQuantity < 0) {
        throw new AppError('Insuficient product quantity');
      }

      updatedProductAndQuantity.push({
        id: product.id,
        quantity: newQuantity,
      });

      return {
        product_id: product.id,
        price: product.price,
        quantity: Number(findProductAndQuantity?.quantity),
      };
    });

    const order = await this.ordersRepository.create({
      customer,
      products: updatedProducts,
    });

    await this.productsRepository.updateQuantity(updatedProductAndQuantity);

    return order;
  }
}

export default CreateOrderService;
