import { ForbiddenException, Injectable } from "@nestjs/common";
import { AuthDto } from "./dto";
import * as argon from "argon2";
import { PrismaService } from "../../src/prisma/prisma.service";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";

@Injectable({})
export class AuthService {
    constructor(private prisma: PrismaService, private jwt: JwtService, private config: ConfigService) { }
    async signup(dto: AuthDto) {
        const hash = await argon.hash(dto.password)
        try {
            const user = await this.prisma.user.create({
                data: {
                    email: dto.email,
                    password: hash,
                }
            })
            return this.signToken(user.id, user.email)
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code === "P2002") {
                    throw new ForbiddenException('Email already used')
                }
            }
            throw error
        }
    }

    async login(dto: AuthDto) {
        const user = await this.prisma.user.findUnique({
            where: {
                email: dto.email
            }
        })
        if (!user) throw new ForbiddenException('User not found')

        const pwMathes = await argon.verify(user.password, dto.password)
        if (!pwMathes) throw new ForbiddenException('Incorrect Password')

        return this.signToken(user.id, user.email)
    }

    async signToken(userId: number, email: string): Promise<{access_token: string}> {
        const payload = {
            sub: userId,
            email
        }
        const secret = this.config.get('JWT_SECRET')
        const token = await this.jwt.signAsync(payload, {
            expiresIn: '30m',
            secret: secret
        });

        return {
            access_token: token
        }
    }
}