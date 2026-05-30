FROM php:8.2-fpm

RUN apt-get update && apt-get install -y \
    curl \
    zip \
    unzip \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    libzip-dev \
    && docker-php-ext-install \
        pdo_mysql \
        mysqli \
        mbstring \
        zip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN echo "date.timezone=America/Sao_Paulo" > /usr/local/etc/php/conf.d/timezone.ini \
    && echo "upload_max_filesize=16M" > /usr/local/etc/php/conf.d/limits.ini \
    && echo "post_max_size=16M" >> /usr/local/etc/php/conf.d/limits.ini \
    && echo "memory_limit=128M" >> /usr/local/etc/php/conf.d/limits.ini

RUN sed -i 's/;clear_env = no/clear_env = no/' /usr/local/etc/php-fpm.d/www.conf

WORKDIR /var/www/html

EXPOSE 9000

CMD ["php-fpm"]
