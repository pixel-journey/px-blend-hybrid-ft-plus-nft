#include <eosio/eosio.hpp>
#include <eosio/asset.hpp>

using namespace eosio;

// Quest: px-blend-hybrid-ft-plus-nft
// One notification cannot see both an FT transfer and an NFT transfer.
// The client sends [transfer FT, transfer NFTs, craft] as one transaction.
CONTRACT px_hybrid_blend : public contract {
public:
    using contract::contract;

    struct ingredient_req {
        name collection_name;
        name schema_name;
        int32_t template_id;
        uint32_t count;
    };

    struct [[eosio::table]] recipe_row {
        uint64_t recipe_id;
        extended_asset ft_cost;
        std::vector<ingredient_req> nft_inputs;
        bool burn_nfts;
        name output_collection;
        name output_schema;
        int32_t output_template_id;
        uint64_t primary_key() const { return recipe_id; }
    };
    typedef multi_index<"recipes"_n, recipe_row> recipes_table;

    struct [[eosio::table]] deposit_row {
        name user;
        extended_asset ft;
        std::vector<uint64_t> asset_ids;
        uint64_t primary_key() const { return user.value; }
    };
    typedef multi_index<"deposits"_n, deposit_row> deposits_table;

    [[eosio::on_notify("eosio.token::transfer")]]
    void on_ft(name from, name to, asset quantity, std::string memo) {
        if (from == get_self() || to != get_self()) return;
        check(get_first_receiver() == "eosio.token"_n, "fake token");
        // Extend this allowlist per recipe. Do not accept every symbol.
        check(memo.rfind("blend:", 0) == 0, "memo must start with blend:");
        add_ft(from, quantity);
    }

    [[eosio::on_notify("atomicassets::transfer")]]
    void on_nft(name from, name to, std::vector<uint64_t> asset_ids, std::string memo) {
        if (from == get_self() || to != get_self()) return;
        check(get_first_receiver() == "atomicassets"_n, "fake nft");
        check(memo.rfind("blend:", 0) == 0, "memo must start with blend:");
        check(asset_ids.size() > 0 && asset_ids.size() <= 20, "bad asset batch");
        add_nfts(from, asset_ids);
    }

    [[eosio::action]]
    void craft(name user, uint64_t recipe_id) {
        require_auth(user);
        recipes_table recipes(get_self(), get_self().value);
        const auto& recipe = recipes.get(recipe_id, "unknown recipe");
        deposits_table deposits(get_self(), get_self().value);
        const auto& dep = deposits.get(user.value, "nothing deposited");
        check(dep.ft.quantity.amount >= recipe.ft_cost.quantity.amount, "insufficient FT");
        check(dep.ft.contract == recipe.ft_cost.contract, "wrong FT contract");
        check(dep.ft.quantity.symbol == recipe.ft_cost.quantity.symbol, "wrong symbol");
        // Match each asset_id against atomicassets::assets in get_self()'s scope.
        // Reject duplicate ids. Burn or retain, then mintasset.
        // Erase the deposit in the same action. A failed check reverts all three actions.
        (void)recipe;
    }

private:
    void add_ft(name user, asset quantity) {
        deposits_table deposits(get_self(), get_self().value);
        auto itr = deposits.find(user.value);
        if (itr == deposits.end()) {
            deposits.emplace(user, [&](auto& row) {
                row.user = user;
                row.ft = extended_asset{quantity, get_first_receiver()};
            });
        } else {
            deposits.modify(itr, same_payer, [&](auto& row) {
                check(row.ft.quantity.symbol == quantity.symbol, "mixed symbols");
                check(row.ft.contract == get_first_receiver(), "mixed contracts");
                row.ft.quantity += quantity;
            });
        }
    }

    void add_nfts(name user, const std::vector<uint64_t>& asset_ids) {
        deposits_table deposits(get_self(), get_self().value);
        auto itr = deposits.find(user.value);
        if (itr == deposits.end()) {
            deposits.emplace(user, [&](auto& row) {
                row.user = user;
                row.ft = extended_asset{asset(0, symbol("WAX", 8)), "eosio.token"_n};
                row.asset_ids = asset_ids;
            });
        } else {
            deposits.modify(itr, same_payer, [&](auto& row) {
                row.asset_ids.insert(row.asset_ids.end(), asset_ids.begin(), asset_ids.end());
            });
        }
    }
};
