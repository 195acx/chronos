#include <iostream>

int fact(int n) {
    if (n == 0)
        return 0;          // bug: should return 1
    int r = n * fact(n - 1);
    return r;
}

int main() {
    int result = fact(3);
    std::cout << result << "\n";
    return 0;
}