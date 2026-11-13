#include <iostream>

int getRate(int tier) {
    int baseRate = 5;
    if (tier > 2) {
        return baseRate * 2;
    }
    return baseRate;
}

int calculateTax(int income, int tier) {
    int rate = getRate(tier);
    int tax = (income * rate) / 100;
    return tax;
}

int main() {
    int income = 1000;
    int tier = 3;
    int tax = calculateTax(income, tier);
    std::cout << "Tax: " << tax << "\n";
    return 0;
}
