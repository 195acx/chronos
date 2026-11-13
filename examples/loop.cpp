#include <iostream>

int main() {
    int sum = 0;
    int limit = 4;
    for (int i = 1; i <= limit; ++i) {
        sum += i * 2;
    }
    std::cout << "Sum: " << sum << "\n";
    return 0;
}
